<?php

declare(strict_types=1);

namespace app\modules\mail_service\infrastructure;

use app\modules\mail_service\application\CallbackSender;

final class HttpCallbackSender implements CallbackSender
{
    private const TIMEOUT_SECONDS = 10;

    public function send(string $callbackUrl, array $body): void
    {
        $curl = curl_init($callbackUrl);
        if ($curl === false) {
            throw new \RuntimeException('Cannot initialise curl.');
        }
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($body, JSON_THROW_ON_ERROR),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => self::TIMEOUT_SECONDS,
        ]);
        $response = curl_exec($curl);
        $httpCode = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $error = curl_error($curl);
        curl_close($curl);

        if ($response === false) {
            throw new \RuntimeException("Callback to $callbackUrl failed: $error");
        }
        if ($httpCode < 200 || $httpCode >= 300) {
            throw new \RuntimeException("Callback to $callbackUrl answered HTTP $httpCode.");
        }
    }
}
