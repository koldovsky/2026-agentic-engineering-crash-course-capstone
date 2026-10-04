<?php

declare(strict_types=1);

namespace app\domain\process;

final class InvalidProcessValue extends \InvalidArgumentException
{
    private function __construct(public readonly string $field, string $message)
    {
        parent::__construct($message);
    }

    public static function empty(string $field): self
    {
        return new self($field, sprintf('%s must not be empty.', $field));
    }

    public static function tooLong(string $field, int $maxLength): self
    {
        return new self($field, sprintf('%s must be at most %d characters.', $field, $maxLength));
    }
}
