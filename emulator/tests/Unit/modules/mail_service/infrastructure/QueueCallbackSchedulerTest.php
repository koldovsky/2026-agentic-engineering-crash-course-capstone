<?php

declare(strict_types=1);

namespace app\tests\Unit\modules\mail_service\infrastructure;

use app\modules\mail_service\infrastructure\queue\InitProcessCallbackJob;
use app\modules\mail_service\infrastructure\QueueCallbackScheduler;
use Codeception\Test\Unit;
use yii\queue\Queue;

final class QueueCallbackSchedulerTest extends Unit
{
    public function testPushesTheCallbackJobWithAFixedFiveSecondDelay(): void
    {
        $queue = new class extends Queue {
            public mixed $pushed = null;
            public mixed $delayed = null;

            protected function pushMessage($message, $ttr, $delay, $priority)
            {
                $this->pushed = $this->serializer->unserialize($message);
                $this->delayed = $delay;

                return 'id-1';
            }

            public function status($id)
            {
                return self::STATUS_WAITING;
            }
        };

        (new QueueCallbackScheduler($queue))->schedule('p1', 'http://demo.dev/mail_service/v1/callback', ['Sending', 'Sended']);

        $this->assertInstanceOf(InitProcessCallbackJob::class, $queue->pushed);
        $this->assertSame('p1', $queue->pushed->processId);
        $this->assertSame(['Sending', 'Sended'], $queue->pushed->statuses);
        $this->assertSame(5, $queue->delayed);
    }
}
