<?php

declare(strict_types=1);

namespace app\modules\mail_service;

use app\modules\mail_service\domain\RemoteServiceClient;
use app\modules\mail_service\infrastructure\CurlRemoteServiceClient;
use Yii;
use yii\base\BootstrapInterface;
use yii\base\Module as BaseModule;
use yii\rest\UrlRule;

/** Module `mail_service`; its bootstrap() is the composition root (URL rules, DI bindings, signature keys). */
final class Module extends BaseModule implements BootstrapInterface
{
    /** Base URL of the remote service; in tests the emulator's module (module.service.yaml: emulator_url + /<id>). */
    public string $remoteServiceUrl = 'http://emulator.dev:81/mail_service';

    public int $remoteTimeoutSeconds = 10;

    /**
     * {@inheritdoc}
     */
    public function bootstrap($app): void
    {
        $app->getUrlManager()->addRules([
            [
                'class' => UrlRule::class,
                'controller' => 'mail_service/v1',
                'pluralize' => false,
                // verb-agnostic: BaseController's VerbFilter answers 405 and the CORS pre-flight
                'extraPatterns' => [
                    'init' => 'init',
                    'callback' => 'callback',
                ],
            ],
        ]);

        // the key pair comes from the environment, never from code (AGENTS.md "Signing")
        Yii::$container->set(
            RemoteServiceClient::class,
            fn (): RemoteServiceClient => new CurlRemoteServiceClient(
                $this->remoteServiceUrl,
                (string) getenv('MAIL_SERVICE_API_KEY'),
                (string) getenv('MAIL_SERVICE_SECRET_KEY'),
                $this->remoteTimeoutSeconds,
            ),
        );
    }
}
