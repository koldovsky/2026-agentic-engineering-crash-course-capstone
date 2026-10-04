<?php

declare(strict_types=1);

namespace app\domain\process;

final readonly class ExternalId
{
    public const MAX_LENGTH = 128;

    public function __construct(public string $value)
    {
        Text::assertValid($value, self::MAX_LENGTH, 'external_id');
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }
}
