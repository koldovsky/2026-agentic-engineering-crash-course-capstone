<?php

declare(strict_types=1);

namespace app\modules\mail_service\controllers;

use app\modules\mail_service\application\InitProcessUseCase;
use app\modules\mail_service\application\UnauthorizedRequest;
use app\modules\mail_service\domain\InvalidInitRequest;
use app\modules\mail_service\domain\Scenario;
use yii\rest\Controller;
use yii\web\UnauthorizedHttpException;

/** The emulated mail service: EMU-1 `POST /mail_service/init-process`. */
final class V1Controller extends Controller
{
    /** Scenario selection is an open decision (CLAUDE.md): the live endpoint always plays the default one. */
    private const DEFAULT_SCENARIO = Scenario::SendedAtOnce;

    public function __construct($id, $module, private readonly InitProcessUseCase $initProcess, $config = [])
    {
        parent::__construct($id, $module, $config);
    }

    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        // no authentication is configured in the emulator; the default rateLimiter needs Yii::$app->user
        unset($behaviors['authenticator'], $behaviors['rateLimiter']);

        return $behaviors;
    }

    protected function verbs(): array
    {
        return ['init-process' => ['POST']];
    }

    /** @return array<array-key, mixed> */
    public function actionInitProcess(): array
    {
        $request = \Yii::$app->request;
        $body = $request->getBodyParams();

        try {
            return $this->initProcess->handle(
                $request->getRawBody(),
                $request->headers->get('X-Api-Key'),
                $request->headers->get('X-Signature'),
                is_array($body) ? $body : [],
                self::DEFAULT_SCENARIO,
            );
        } catch (UnauthorizedRequest $e) {
            throw new UnauthorizedHttpException($e->getMessage());
        } catch (InvalidInitRequest $e) {
            \Yii::$app->response->setStatusCode(422);

            return $e->errors;
        }
    }
}
