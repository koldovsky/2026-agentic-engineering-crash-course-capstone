<?php

declare(strict_types=1);

namespace app\domain\process;

final readonly class EmulatedProcessId
{
    public const MAX_LENGTH = 128;

    public function __construct(public string $value)
    {
        Text::assertValid($value, self::MAX_LENGTH, 'process_id');
    }

    public static function generate(): self
    {
        return new self(bin2hex(random_bytes(16)));
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }
}
