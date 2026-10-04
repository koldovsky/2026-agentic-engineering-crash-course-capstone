<?php

declare(strict_types=1);

namespace app\domain\service;

/** Aggregate root; read-only for the host, services are inserted by module migrations. */
final class Service
{
    private function __construct(
        private readonly ServiceId $id,
        private readonly ServiceName $name,
    ) {
    }

    public static function restore(ServiceId $id, ServiceName $name): self
    {
        return new self($id, $name);
    }

    public function id(): ServiceId
    {
        return $this->id;
    }

    public function name(): ServiceName
    {
        return $this->name;
    }
}
