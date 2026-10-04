<?php

declare(strict_types=1);

namespace app\modules\mail_service\infrastructure;

use app\modules\mail_service\application\CallbackScheduler;
use app\modules\mail_service\infrastructure\queue\InitProcessCallbackJob;
use yii\queue\Queue;

/** RabbitMQ delay by TTL + dead-letter exchange (the amqp_interop driver's default, flow.md §6a). */
final class QueueCallbackScheduler implements CallbackScheduler
{
    public const DELAY_SECONDS = 5;

    public function __construct(private readonly Queue $queue)
    {
    }

    public function schedule(string $processId, string $callbackUrl, array $statuses): void
    {
        $this->queue->delay(self::DELAY_SECONDS)->push(new InitProcessCallbackJob($processId, $callbackUrl, $statuses));
    }
}
