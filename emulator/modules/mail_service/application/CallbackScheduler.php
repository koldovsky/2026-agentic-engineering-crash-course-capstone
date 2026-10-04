<?php

declare(strict_types=1);

namespace app\modules\mail_service\application;

interface CallbackScheduler
{
    /**
     * Delivers the first of the statuses to the callback URL after the fixed 5-second delay (flow.md §6a); the rest
     * follow one by one, each 5 seconds after the previous one.
     *
     * @param non-empty-list<string> $statuses remote status values, in the order they are reported
     */
    public function schedule(string $processId, string $callbackUrl, array $statuses): void;
}
