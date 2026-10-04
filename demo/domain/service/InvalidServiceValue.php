<?php

declare(strict_types=1);

namespace app\domain\service;

final class InvalidServiceValue extends \InvalidArgumentException
{
    public function __construct(public readonly string $field, string $message)
    {
        parent::__construct($message);
    }
}
