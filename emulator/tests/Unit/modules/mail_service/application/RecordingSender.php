<?php

declare(strict_types=1);

namespace app\tests\Unit\modules\mail_service\application;

use app\modules\mail_service\application\CallbackSender;

final class RecordingSender implements CallbackSender
{
    /** @var list<array{string, array<string, mixed>}> */
    public array $sent = [];
    public bool $fail = false;

    public function send(string $callbackUrl, array $body): void
    {
        if ($this->fail) {
            throw new \RuntimeException('HTTP 500');
        }
        $this->sent[] = [$callbackUrl, $body];
    }
}
