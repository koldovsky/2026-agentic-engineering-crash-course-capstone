<?php

declare(strict_types=1);

namespace app\modules\mail_service;

use app\modules\mail_service\application\CallbackScheduler;
use app\modules\mail_service\application\CallbackSender;
use app\modules\mail_service\domain\RequestSignature;
use app\modules\mail_service\infrastructure\HttpCallbackSender;
use app\modules\mail_service\infrastructure\QueueCallbackScheduler;
use yii\base\Application;
use yii\base\BootstrapInterface;
use yii\base\Module as BaseModule;
use yii\rest\UrlRule;
use yii\web\Application as WebApplication;

/** Composition root of the emulated mail service; loaded by both the web app and the queue worker (console app). */
final class Module extends BaseModule implements BootstrapInterface
{
    /** @param Application $app */
    public function bootstrap($app): void
    {
        \Yii::$container->setSingleton(RequestSignature::class, static fn () => new RequestSignature(
            (string) getenv('MAIL_SERVICE_API_KEY'),
            (string) getenv('MAIL_SERVICE_SECRET_KEY'),
        ));
        \Yii::$container->setSingleton(CallbackSender::class, HttpCallbackSender::class);
        \Yii::$container->setSingleton(
            CallbackScheduler::class,
            static fn () => new QueueCallbackScheduler($app->get('queue')),
        );

        if ($app instanceof WebApplication) {
            // public URL: /mail_service/init-process (no version segment), controller route mail_service/v1
            $app->getUrlManager()->addRules([[
                'class' => UrlRule::class,
                'controller' => [$this->id => $this->id . '/v1'],
                'pluralize' => false,
                'only' => ['init-process'],
                'extraPatterns' => ['init-process' => 'init-process'],
            ]]);
        }
    }
}
