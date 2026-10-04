<?php

declare(strict_types=1);

namespace app\domain\service;

/** The module id that integrates the service. */
final readonly class ServiceName
{
    public const MAX_LENGTH = 64;
    public const PATTERN = '/^[a-z][a-z0-9_]*$/';

    public function __construct(public string $value)
    {
        if ($value === '') {
            throw new InvalidServiceValue('service', 'service must not be empty.');
        }
        if (mb_strlen($value) > self::MAX_LENGTH) {
            throw new InvalidServiceValue('service', 'service must be at most 64 characters.');
        }
        if (preg_match(self::PATTERN, $value) !== 1) {
            throw new InvalidServiceValue(
                'service',
                'service must be a module id (a-z, 0-9 and _, starting with a letter).'
            );
        }
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }
}
