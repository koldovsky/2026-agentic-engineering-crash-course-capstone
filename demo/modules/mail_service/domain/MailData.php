<?php

declare(strict_types=1);

namespace app\modules\mail_service\domain;

/** The `data` of an init request of the methods general and process. */
final readonly class MailData
{
    public const SEND_TO_MAX_LENGTH = 16;

    private function __construct(
        public int $userId,
        public string $sendTo,
        public string $text,
    ) {
    }

    /**
     * @param array<string, mixed> $data
     * @throws InvalidMailRequest
     */
    public static function fromArray(array $data): self
    {
        $userId = $data['user_id'] ?? null;
        if (!is_int($userId)) {
            throw new InvalidMailRequest('data.user_id is required and must be an integer.');
        }

        $sendTo = $data['send_to'] ?? null;
        if (!is_string($sendTo) || $sendTo === '' || mb_strlen($sendTo) > self::SEND_TO_MAX_LENGTH) {
            throw new InvalidMailRequest(
                sprintf('data.send_to is required and must be a string of at most %d characters.', self::SEND_TO_MAX_LENGTH)
            );
        }

        $text = $data['test'] ?? null;
        if (!is_string($text) || $text === '') {
            throw new InvalidMailRequest('data.test is required and must be a string.');
        }

        return new self($userId, $sendTo, $text);
    }
}
