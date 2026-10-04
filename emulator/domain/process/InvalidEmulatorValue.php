<?php

declare(strict_types=1);

namespace app\domain\process;

final class InvalidEmulatorValue extends \InvalidArgumentException
{
    private function __construct(public readonly string $field, string $message)
    {
        parent::__construct($message);
    }

    public static function empty(string $field): self
    {
        return new self($field, "$field must not be empty.");
    }

    public static function tooLong(string $field, int $maxLength): self
    {
        return new self($field, "$field must be at most $maxLength characters.");
    }
}
