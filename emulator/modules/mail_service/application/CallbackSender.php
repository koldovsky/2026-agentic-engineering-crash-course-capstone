<?php

declare(strict_types=1);

namespace app\modules\mail_service\application;

interface CallbackSender
{
    /**
     * @param array<string, mixed> $body
     * @throws \RuntimeException when the callback was not delivered or the receiver did not answer 2xx
     */
    public function send(string $callbackUrl, array $body): void;
}
