<?php

declare(strict_types=1);

namespace app\tests\Unit\controllers;

use app\application\process\ProcessService;
use app\controllers\BaseController;
use app\domain\process\DuplicateExternalId;
use app\domain\process\ExternalId;
use app\domain\process\Process;
use app\domain\process\ProcessRepository;
use app\domain\process\RequestId;
use app\domain\process\Status;
use app\domain\service\Service;
use app\domain\service\ServiceId;
use app\domain\service\ServiceName;
use app\domain\service\ServiceRepository;
use Closure;
use Codeception\Test\Unit;
use Yii;
use yii\web\BadRequestHttpException;
use yii\web\NotFoundHttpException;
use yii\web\ServerErrorHttpException;

final class BaseControllerTest extends Unit
{
    /** @var ProcessRepository&object */
    private $repository;

    protected function _before(): void
    {
        $this->repository = $this->processFake();
        $services = $this->serviceFake();

        Yii::$container->setSingleton(ProcessRepository::class, fn () => $this->repository);
        Yii::$container->setSingleton(ServiceRepository::class, fn () => $services);
        Yii::$container->setSingleton(ProcessService::class, ProcessService::class);
        $_SERVER['REQUEST_METHOD'] = 'POST';
    }

    protected function _after(): void
    {
        Yii::$container->clear(ProcessRepository::class);
        Yii::$container->clear(ServiceRepository::class);
        Yii::$container->clear(ProcessService::class);
    }

    private function processFake(): ProcessRepository
    {
        return new class implements ProcessRepository {
            /** @var array<int, Process> */
            private array $stored = [];

            public function get(RequestId $requestId): Process
            {
                foreach ($this->stored as $process) {
                    if ($process->requestId()->equals($requestId)) {
                        return $process;
                    }
                }
                throw new \OutOfBoundsException('No stored process ' . $requestId->value);
            }

            public function existsByRequestId(RequestId $requestId): bool
            {
                foreach ($this->stored as $process) {
                    if ($process->requestId()->equals($requestId)) {
                        return true;
                    }
                }

                return false;
            }

            public function count(): int
            {
                return count($this->stored);
            }

            public function findByExternalId(ServiceId $serviceId, ExternalId $externalId): ?Process
            {
                foreach ($this->stored as $process) {
                    if ($process->serviceId()->equals($serviceId) && $process->externalId()?->equals($externalId)) {
                        return clone $process;
                    }
                }

                return null;
            }

            public function findById(int $id): ?Process
            {
                return isset($this->stored[$id]) ? clone $this->stored[$id] : null;
            }

            public function save(Process $process): void
            {
                $externalId = $process->externalId();
                if ($externalId !== null) {
                    foreach ($this->stored as $other) {
                        if ($other->id() !== $process->id()
                            && $other->serviceId()->equals($process->serviceId())
                            && $other->externalId()?->equals($externalId)
                        ) {
                            throw new DuplicateExternalId($process->serviceId(), $externalId);
                        }
                    }
                }
                $id = $process->id() ?? count($this->stored) + 1;
                $process->recordPersisted($id, 100, 100);
                $this->stored[$id] = clone $process;
            }
        };
    }

    private function serviceFake(): ServiceRepository
    {
        return new class implements ServiceRepository {
            public function findByName(ServiceName $name): ?Service
            {
                return match ($name->value) {
                    'test' => Service::restore(new ServiceId(1), $name),
                    'other' => Service::restore(new ServiceId(2), $name),
                    default => null,
                };
            }
        };
    }

    private function controller(string $service = 'test', ?Closure $handler = null, string $status = 'success'): BaseController
    {
        $handler ??= static function (string $type, Process $process): array {
            if ($type === 'init') {
                $process->changeStatus(Status::Process);
            }

            return ['type' => $type];
        };

        return new class ('v1', new \yii\base\Module($service, Yii::$app), $handler, $status) extends BaseController {
            public function __construct(string $id, \yii\base\Module $module, private Closure $handler, private string $status, array $config = [])
            {
                parent::__construct($id, $module, $config);
            }

            protected function doProcess(string $type, Process $process, array $data): array
            {
                return ($this->handler)($type, $process, $data);
            }

            protected function getExternalId(array $data): string
            {
                return (string) ($data['pid'] ?? '');
            }

            protected function getCallbackStatus(array $data): string
            {
                return $this->status;
            }
        };
    }

    private function send(BaseController $controller, string $action, mixed $body): mixed
    {
        Yii::$app->response->clear();
        Yii::$app->request->setBodyParams($body);

        return $controller->runAction($action);
    }

    private function initBody(string $requestId = 'r-1'): array
    {
        return ['requestId' => $requestId, 'service_method' => 'pay', 'data' => ['amount' => 5]];
    }

    private function assignExternal(string $externalId, Status $status = Status::Process): Closure
    {
        return static function (string $type, Process $process) use ($externalId, $status): array {
            $process->assignExternalId(new ExternalId($externalId));
            $process->changeStatus($status);

            return [];
        };
    }

    private function stored(string $requestId): Process
    {
        return $this->repository->get(new RequestId($requestId));
    }

    private function statusCode(): int
    {
        return Yii::$app->response->statusCode;
    }

    public function testInitMergesModuleKeysAndStoresExternalIdAndStatus(): void
    {
        $controller = $this->controller('test', static function (string $type, Process $process): array {
            $process->assignExternalId(new ExternalId('ext-1'));
            $process->changeStatus(Status::Process);

            return ['pid' => 'ext-1', 'requestId' => 'overridden', 'status' => 'overridden'];
        });

        $result = $this->send($controller, 'init', $this->initBody());

        $this->assertSame(200, $this->statusCode());
        $this->assertSame(['pid' => 'ext-1', 'requestId' => 'r-1', 'status' => 'process'], $result);
        $stored = $this->stored('r-1');
        $this->assertSame('ext-1', $stored->externalId()?->value);
        $this->assertSame(Status::Process, $stored->status());
    }

    public function testProcessIsStoredInInitBeforeDoProcess(): void
    {
        $seen = [];
        $controller = $this->controller('test', function (string $type, Process $process) use (&$seen): array {
            $stored = $this->stored('r-1');
            $seen = [$stored->status(), $stored->serviceId()->value];
            $process->changeStatus(Status::Process);

            return [];
        });

        $this->send($controller, 'init', $this->initBody());

        $this->assertSame([Status::Init, 1], $seen);
    }

    public function testInvalidBodyIs422WithAllFields(): void
    {
        $result = $this->send($this->controller(), 'init', []);

        $this->assertSame(422, $this->statusCode());
        $this->assertSame(['requestId', 'service_method', 'data'], array_column($result, 'field'));
        $this->assertSame(0, $this->repository->count());
    }

    public function testNonObjectInitBodyIs422OnBody(): void
    {
        $result = $this->send($this->controller(), 'init', 'x');

        $this->assertSame(422, $this->statusCode());
        $this->assertSame(['body'], array_column($result, 'field'));
    }

    public function testDuplicateRequestIdIs422(): void
    {
        $this->send($this->controller(), 'init', $this->initBody());
        $result = $this->send($this->controller(), 'init', $this->initBody());

        $this->assertSame(422, $this->statusCode());
        $this->assertSame(['requestId'], array_column($result, 'field'));
    }

    public function testUnknownServiceOnInit(): void
    {
        try {
            $this->send($this->controller('unknown'), 'init', $this->initBody());
            $this->fail('Expected ServerErrorHttpException.');
        } catch (ServerErrorHttpException) {
            $this->assertSame(0, $this->repository->count());
        }
    }

    public function testExceptionInDoProcessOnInit(): void
    {
        $controller = $this->controller('test', static function (): array {
            throw new \RuntimeException('boom');
        });

        $result = $this->send($controller, 'init', $this->initBody());

        $this->assertSame(500, $this->statusCode());
        $this->assertSame(['requestId' => 'r-1', 'status' => 'error'], $result);
        $this->assertSame(Status::Error, $this->stored('r-1')->status());
    }

    public function testModuleSettingErrorOnInit(): void
    {
        $controller = $this->controller('test', static function (string $type, Process $process): array {
            $process->changeStatus(Status::Error);

            return [];
        });

        $this->send($controller, 'init', $this->initBody());

        $this->assertSame(500, $this->statusCode());
        $this->assertSame(Status::Error, $this->stored('r-1')->status());
    }

    public function testModuleLeavingProcessInInit(): void
    {
        $controller = $this->controller('test', static fn (): array => []);

        $result = $this->send($controller, 'init', $this->initBody());

        $this->assertSame(500, $this->statusCode());
        $this->assertSame('error', $result['status']);
        $this->assertSame(Status::Error, $this->stored('r-1')->status());
    }

    public function testSameExternalIdInTwoServices(): void
    {
        $this->send($this->controller('test', $this->assignExternal('ext-1')), 'init', $this->initBody('r-1'));
        $this->send($this->controller('other', $this->assignExternal('ext-1')), 'init', $this->initBody('r-2'));

        $this->assertSame(200, $this->statusCode());
        $first = $this->stored('r-1');
        $second = $this->stored('r-2');
        $this->assertSame(1, $first->serviceId()->value);
        $this->assertSame(2, $second->serviceId()->value);
        $this->assertSame('ext-1', $first->externalId()?->value);
        $this->assertSame('ext-1', $second->externalId()?->value);
    }

    public function testDuplicateExternalIdWithinOneService(): void
    {
        $this->send($this->controller('test', $this->assignExternal('dup')), 'init', $this->initBody('r-1'));
        $result = $this->send($this->controller('test', $this->assignExternal('dup')), 'init', $this->initBody('r-2'));

        $this->assertSame(500, $this->statusCode());
        $this->assertSame('error', $result['status']);
        $second = $this->stored('r-2');
        $this->assertSame(Status::Error, $second->status());
        $this->assertNull($second->externalId());
        $this->assertSame(Status::Process, $this->stored('r-1')->status());
    }

    public function testCallbackFailThenSuccessBothApplied(): void
    {
        $this->send($this->controller('test', $this->assignExternal('ext-1')), 'init', $this->initBody());

        $this->send($this->controller('test', null, 'fail'), 'callback', ['pid' => 'ext-1']);
        $this->assertSame(Status::Fail, $this->stored('r-1')->status());

        $result = $this->send($this->controller('test', null, 'success'), 'callback', ['pid' => 'ext-1']);
        $this->assertSame(200, $this->statusCode());
        $this->assertSame(['type' => 'callback'], $result);
        $this->assertSame(Status::Success, $this->stored('r-1')->status());
    }

    public function testCallbackStatusErrorIs500AndStoredError(): void
    {
        $this->send($this->controller('test', $this->assignExternal('ext-1')), 'init', $this->initBody());

        $result = $this->send($this->controller('test', null, 'error'), 'callback', ['pid' => 'ext-1']);

        $this->assertSame(500, $this->statusCode());
        $this->assertSame(['requestId' => 'r-1', 'status' => 'error'], $result);
        $this->assertSame(Status::Error, $this->stored('r-1')->status());
    }

    public function testCallbackOfOtherServiceDoesNotSeeProcess(): void
    {
        $this->send($this->controller('test', $this->assignExternal('ext-1')), 'init', $this->initBody());

        try {
            $this->send($this->controller('other'), 'callback', ['pid' => 'ext-1']);
            $this->fail('Expected NotFoundHttpException.');
        } catch (NotFoundHttpException) {
            $this->assertSame(Status::Process, $this->stored('r-1')->status());
        }
    }

    public function testCallbackBeforeInitAnswerIsNotFound(): void
    {
        Yii::$container->get(ProcessService::class)->start(
            new ServiceName('test'),
            new RequestId('r-1'),
            new \app\domain\process\ServiceMethod('pay'),
            $this->initBody()
        );

        $this->expectException(NotFoundHttpException::class);
        $this->send($this->controller(), 'callback', ['pid' => 'ext-1']);
    }

    public function testUnknownServiceOnCallback(): void
    {
        $this->expectException(ServerErrorHttpException::class);
        $this->send($this->controller('unknown'), 'callback', ['pid' => 'ext-1']);
    }

    public function testUnknownProcessIsNotFound(): void
    {
        $this->expectException(NotFoundHttpException::class);
        $this->send($this->controller(), 'callback', ['pid' => 'nope']);
    }

    public function testCallbackWithoutProcessIdOrEmptyBodyIsBadRequest(): void
    {
        foreach ([['status' => 'x'], []] as $body) {
            try {
                $this->send($this->controller(), 'callback', $body);
                $this->fail('Expected BadRequestHttpException.');
            } catch (BadRequestHttpException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function testCallbackWithNonObjectBodyIsBadRequest(): void
    {
        $this->expectException(BadRequestHttpException::class);
        $this->send($this->controller(), 'callback', 5);
    }
}
