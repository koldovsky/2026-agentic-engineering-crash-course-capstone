<?php

declare(strict_types=1);

namespace app\domain\service;

interface ServiceRepository
{
    public function findByName(ServiceName $name): ?Service;
}
