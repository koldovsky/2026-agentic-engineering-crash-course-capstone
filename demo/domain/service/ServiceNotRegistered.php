<?php

declare(strict_types=1);

namespace app\domain\service;

final class ServiceNotRegistered extends \DomainException
{
    public function __construct(ServiceName $name)
    {
        parent::__construct(
            sprintf('No service "%s" is registered (is the module\'s service migration applied?).', $name->value)
        );
    }
}
