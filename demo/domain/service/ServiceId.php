<?php

declare(strict_types=1);

namespace app\domain\service;

final readonly class ServiceId
{
    public function __construct(public int $value)
    {
        if ($value < 1) {
            throw new InvalidServiceValue('service_id', 'service_id must be a positive integer.');
        }
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }
}
