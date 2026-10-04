<?php

declare(strict_types=1);

namespace app\tests\Unit\modules\mail_service\application;

use app\modules\mail_service\application\CallbackScheduler;

final class RecordingScheduler implements CallbackScheduler
{
    /** @var list<array{string, string, list<string>}> */
    public array $scheduled = [];

    public function schedule(string $processId, string $callbackUrl, array $statuses): void
    {
        $this->scheduled[] = [$processId, $callbackUrl, $statuses];
    }
}
