<?php

declare(strict_types=1);

namespace app\modules\mail_service\infrastructure\queue;

use app\modules\mail_service\application\SendCallbackUseCase;
use yii\queue\JobInterface;

/** Queue message: scalars only, so it serializes; the services are resolved when the worker runs it. */
final class InitProcessCallbackJob implements JobInterface
{
    /** @param non-empty-list<string> $statuses */
    public function __construct(
        public string $processId,
        public string $callbackUrl,
        public array $statuses,
    ) {
    }

    public function execute($queue): void
    {
        \Yii::$container->get(SendCallbackUseCase::class)->handle($this->processId, $this->callbackUrl, $this->statuses);
    }
}
