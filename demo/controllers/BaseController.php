<?php

declare(strict_types=1);

namespace app\controllers;

use app\application\process\ProcessService;
use app\domain\process\DuplicateRequestId;
use app\domain\process\ExternalId;
use app\domain\process\InvalidProcessValue;
use app\domain\process\Process;
use app\domain\process\ProcessNotFound;
use app\domain\process\RequestId;
use app\domain\process\ServiceMethod;
use app\domain\process\Status;
use app\domain\service\InvalidServiceValue;
use app\domain\service\ServiceName;
use app\domain\service\ServiceNotRegistered;
use UnexpectedValueException;
use Throwable;
use Yii;
use yii\filters\Cors;
use yii\rest\Controller;
use yii\web\BadRequestHttpException;
use yii\web\NotFoundHttpException;
use yii\web\ServerErrorHttpException;

/**
 * Parent of every module controller - the two standard requests of the flow. A module controller implements only
 * doProcess(), getExternalId() and getCallbackStatus().
 */
abstract class BaseController extends Controller
{
    /**
     * {@inheritdoc}
     */
    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        $behaviors['authenticator']['except'] = ['options'];
        // rate limiting works per user identity; there is none until the authentication method is decided -
        // without this every request fails with 500
        unset($behaviors['rateLimiter']);

        // CORS runs before authentication, so pre-flight OPTIONS requests are never authenticated
        return ['corsFilter' => ['class' => Cors::class]] + $behaviors;
    }

    /**
     * {@inheritdoc}
     */
    protected function verbs(): array
    {
        return [
            'init' => ['POST'],
            'callback' => ['POST'],
        ];
    }

    /**
     * Init process: stores the process (status init), lets the module call the remote service, saves the result.
     *
     * @return array<int|string, mixed> the result, or the list of {field, message} errors (HTTP 422)
     */
    public function actionInit(ProcessService $processes): array
    {
        $body = $this->request->getBodyParams();
        if (!is_array($body)) {
            return $this->unprocessable(['body' => 'The request body must be a JSON object.']);
        }

        $errors = [];
        $requestId = $this->valueFromBody($body, 'requestId', RequestId::class, $errors);
        $serviceMethod = $this->valueFromBody($body, 'service_method', ServiceMethod::class, $errors);
        if (!isset($body['data']) || !is_array($body['data'])) {
            $errors['data'] = 'data is required and must be an object.';
        }
        if ($errors !== [] || $requestId === null || $serviceMethod === null) {
            return $this->unprocessable($errors);
        }

        try {
            $process = $processes->start($this->serviceName(), $requestId, $serviceMethod, $body);
        } catch (ServiceNotRegistered | InvalidServiceValue $e) {
            $this->serviceMisconfigured($e);
        } catch (DuplicateRequestId $e) {
            return $this->unprocessable(['requestId' => $e->getMessage()]);
        }

        try {
            $result = $this->doProcess('init', $process, $body['data']);
            if ($process->status() === Status::Init) {
                throw new UnexpectedValueException(
                    'doProcess() left the process in "init"; it must set success, process or fail.'
                );
            }
            if ($process->status() === Status::Error) {
                throw new UnexpectedValueException(
                    'doProcess() set the status "error"; it must set success, process or fail.'
                );
            }
            $processes->save($process);
        } catch (Throwable $e) {
            return $this->failWithError($processes, $process, $e);
        }

        return array_merge($result, [
            'requestId' => $process->requestId()->value,
            'status' => $process->status()->value,
        ]);
    }

    /**
     * Callback of the remote service: applies its status and result to the process.
     *
     * @return array<string, mixed>
     */
    public function actionCallback(ProcessService $processes): array
    {
        $body = $this->request->getBodyParams();
        if (!is_array($body)) {
            throw new BadRequestHttpException('The callback body must be a JSON object.');
        }
        if ($body === []) {
            throw new BadRequestHttpException('The callback body is empty.');
        }

        try {
            $externalId = new ExternalId($this->getExternalId($body));
        } catch (InvalidProcessValue) {
            throw new BadRequestHttpException('The callback body has no process id.');
        }

        try {
            $process = $processes->getByExternalId($this->serviceName(), $externalId);
        } catch (ServiceNotRegistered | InvalidServiceValue $e) {
            $this->serviceMisconfigured($e);
        } catch (ProcessNotFound $e) {
            throw new NotFoundHttpException($e->getMessage());
        }

        try {
            $process->changeStatus($this->callbackStatus($body));
            $result = $this->doProcess('callback', $process, $body);
            $processes->save($process);
        } catch (Throwable $e) {
            return $this->failWithError($processes, $process, $e);
        }

        return $result;
    }

    /**
     * @param string $type 'init' or 'callback'
     * @param Process $process the process of this request (domain entity); apply results through its methods
     * @param array<string, mixed> $data init: the `data` of the body; callback: the whole body
     * @return array<string, mixed> the response body (on init merged with requestId and status)
     */
    abstract protected function doProcess(string $type, Process $process, array $data): array;

    /**
     * @param array<string, mixed> $data the callback body
     * @return string the remote service's process id
     */
    abstract protected function getExternalId(array $data): string;

    /**
     * @param array<string, mixed> $data the callback body
     * @return string our status: success, process or fail (never error)
     */
    abstract protected function getCallbackStatus(array $data): string;

    private function callbackStatus(array $data): Status
    {
        $value = $this->getCallbackStatus($data);
        $status = Status::tryFrom($value);
        if ($status === null || !$status->isMappable()) {
            throw new UnexpectedValueException(
                sprintf('getCallbackStatus() returned "%s"; allowed: success, process, fail.', $value)
            );
        }

        return $status;
    }

    /**
     * @template T of RequestId|ServiceMethod
     * @param array<string, mixed> $body
     * @param class-string<T> $valueClass
     * @param array<string, string> $errors
     * @return T|null
     */
    private function valueFromBody(array $body, string $field, string $valueClass, array &$errors): RequestId|ServiceMethod|null
    {
        if (!isset($body[$field]) || !is_string($body[$field])) {
            $errors[$field] = sprintf('%s is required and must be a string.', $field);

            return null;
        }

        try {
            return new $valueClass($body[$field]);
        } catch (InvalidProcessValue $e) {
            $errors[$field] = $e->getMessage();

            return null;
        }
    }

    /**
     * @param array<string, string> $errors field => message
     * @return list<array{field: string, message: string}>
     */
    private function unprocessable(array $errors): array
    {
        $this->response->setStatusCode(422);

        $result = [];
        foreach ($errors as $field => $message) {
            $result[] = ['field' => (string) $field, 'message' => $message];
        }

        return $result;
    }

    /**
     * @return array{requestId: string, status: string}
     */
    private function failWithError(ProcessService $processes, Process $process, Throwable $e): array
    {
        // first: if saving fails too, the module's exception must not be lost
        Yii::error($e, __METHOD__);
        $processes->recordError($process);
        $this->response->setStatusCode(500);

        return ['requestId' => $process->requestId()->value, 'status' => Status::Error->value];
    }

    private function serviceName(): ServiceName
    {
        return new ServiceName($this->module->id);
    }

    private function serviceMisconfigured(Throwable $e): never
    {
        Yii::error($e, __METHOD__);

        throw new ServerErrorHttpException($e->getMessage());
    }
}
