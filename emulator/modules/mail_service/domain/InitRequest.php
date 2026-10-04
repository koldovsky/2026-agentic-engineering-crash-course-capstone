<?php

declare(strict_types=1);

namespace app\modules\mail_service\domain;

/** EMU-2: the validated body of the remote service's init request. */
final readonly class InitRequest
{
    public const SERVICES = ['general', 'process'];
    private const REQUIRED = ['request_id', 'service', 'to', 'text', 'callback_url'];

    private function __construct(
        public string $requestId,
        public string $service,
        public string $to,
        public string $text,
        public string $callbackUrl,
    ) {
    }

    /** @param array<array-key, mixed> $body */
    public static function fromArray(array $body): self
    {
        $errors = [];
        foreach (self::REQUIRED as $field) {
            $value = $body[$field] ?? null;
            if (!is_string($value) || trim($value) === '') {
                $errors[] = ['field' => $field, 'message' => "$field is required and must be a non-empty string."];
            }
        }
        if ($errors === [] && !in_array($body['service'], self::SERVICES, true)) {
            $errors[] = ['field' => 'service', 'message' => 'service must be one of: ' . implode(', ', self::SERVICES) . '.'];
        }
        if ($errors !== []) {
            throw new InvalidInitRequest($errors);
        }

        return new self($body['request_id'], $body['service'], $body['to'], $body['text'], $body['callback_url']);
    }
}
