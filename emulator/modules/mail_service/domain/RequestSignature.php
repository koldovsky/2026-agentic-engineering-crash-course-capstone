<?php

declare(strict_types=1);

namespace app\modules\mail_service\domain;

/** EMU-3: HMAC-SHA256 over the raw JSON body (flow.md §1b), checked against the emulator's own copy of the key pair. */
final readonly class RequestSignature
{
    public function __construct(private string $apiKey, private string $secretKey)
    {
    }

    public function isValid(?string $apiKey, ?string $signature, string $rawBody): bool
    {
        if ($this->apiKey === '' || $this->secretKey === '' || $apiKey === null || $signature === null) {
            return false;
        }
        $expected = hash_hmac('sha256', $rawBody, $this->secretKey);

        return hash_equals($this->apiKey, $apiKey) && hash_equals($expected, $signature);
    }
}
