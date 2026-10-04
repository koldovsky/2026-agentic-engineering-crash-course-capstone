<?php

declare(strict_types=1);

namespace app\domain\process;

final readonly class RequestId
{
    public const MAX_LENGTH = 64;

    public function __construct(public string $value)
    {
        Text::assertValid($value, self::MAX_LENGTH, 'requestId');
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }
}
