<?php

declare(strict_types=1);

namespace app\tests\Unit\application\process;

use app\application\process\ProcessService;
use app\domain\process\DuplicateExternalId;
use app\domain\process\DuplicateRequestId;
use app\domain\process\ExternalId;
use app\domain\process\Process;
use app\domain\process\ProcessNotFound;
use app\domain\process\ProcessRepository;
use app\domain\process\RequestId;
use app\domain\process\ServiceMethod;
use app\domain\process\Status;
use app\domain\service\Service;
use app\domain\service\ServiceId;
use app\domain\service\ServiceName;
use app\domain\service\ServiceNotRegistered;
use app\domain\service\ServiceRepository;
use Codeception\Test\Unit;

final class ProcessServiceTest extends Unit
{
    private ProcessRepository $repository;
    private ProcessService $service;

    protected function _before(): void
    {
        $this->repository = $this->processFake();
        $this->service = new ProcessService($this->repository, $this->serviceFake());
    }

    private function processFake(): ProcessRepository
    {
        return new class implements ProcessRepository {
            /** @var array<int, Process> */
            private array $stored = [];

            public function existsByRequestId(RequestId $requestId): bool
            {
                foreach ($this->stored as $process) {
                    if ($process->requestId()->equals($requestId)) {
                        return true;
                    }
                }

                return false;
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

            public function count(): int
            {
                return count($this->stored);
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

    private function start(string $service, string $requestId): Process
    {
        return $this->service->start(
            new ServiceName($service),
            new RequestId($requestId),
            new ServiceMethod('pay'),
            ['requestId' => $requestId]
        );
    }

    private function startWithExternalId(string $service, string $requestId, string $externalId): Process
    {
        $process = $this->start($service, $requestId);
        $process->assignExternalId(new ExternalId($externalId));
        $this->service->save($process);

        return $process;
    }

    public function testStartStoresNewProcessInInit(): void
    {
        $process = $this->start('test', 'r-1');

        $this->assertSame(Status::Init, $process->status());
        $this->assertSame(1, $process->serviceId()->value);
        $this->assertSame(1, $process->id());
        $this->assertTrue($this->repository->existsByRequestId(new RequestId('r-1')));
    }

    public function testStartForUnknownServiceStoresNothing(): void
    {
        try {
            $this->start('unknown', 'r-1');
            $this->fail('Expected ServiceNotRegistered.');
        } catch (ServiceNotRegistered) {
            $this->assertFalse($this->repository->existsByRequestId(new RequestId('r-1')));
        }
    }

    public function testStartWithSameRequestIdFails(): void
    {
        $this->start('test', 'r-1');

        $this->expectException(DuplicateRequestId::class);
        $this->start('test', 'r-1');
    }

    public function testGetByExternalIdFindsProcess(): void
    {
        $process = $this->startWithExternalId('test', 'r-1', 'ext-1');

        $found = $this->service->getByExternalId(new ServiceName('test'), new ExternalId('ext-1'));

        $this->assertSame($process->id(), $found->id());
        $this->assertTrue($found->requestId()->equals($process->requestId()));
    }

    public function testGetByExternalIdIsScopedByService(): void
    {
        $mine = $this->startWithExternalId('test', 'r-1', 'ext-1');
        $theirs = $this->startWithExternalId('other', 'r-2', 'ext-1');

        $foundMine = $this->service->getByExternalId(new ServiceName('test'), new ExternalId('ext-1'));
        $foundTheirs = $this->service->getByExternalId(new ServiceName('other'), new ExternalId('ext-1'));

        $this->assertSame($mine->id(), $foundMine->id());
        $this->assertSame($theirs->id(), $foundTheirs->id());

        $this->startWithExternalId('test', 'r-3', 'only-test');
        $this->expectException(ProcessNotFound::class);
        $this->service->getByExternalId(new ServiceName('other'), new ExternalId('only-test'));
    }

    public function testGetByExternalIdForUnknownService(): void
    {
        $this->expectException(ServiceNotRegistered::class);
        $this->service->getByExternalId(new ServiceName('unknown'), new ExternalId('ext-1'));
    }

    public function testRecordErrorStoresStatusError(): void
    {
        $process = $this->start('test', 'r-1');

        $this->service->recordError($process);

        $stored = $this->repository->findById((int) $process->id());
        $this->assertSame(Status::Error, $stored?->status());
    }

    public function testRecordErrorAfterDuplicateExternalId(): void
    {
        $this->startWithExternalId('test', 'r-1', 'ext-1');
        $second = $this->start('test', 'r-2');
        $second->assignExternalId(new ExternalId('ext-1'));

        $this->service->recordError($second);

        $stored = $this->repository->findById((int) $second->id());
        $this->assertSame(Status::Error, $stored?->status());
        $this->assertNull($stored->externalId());
    }
}
