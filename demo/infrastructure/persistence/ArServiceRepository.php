<?php

declare(strict_types=1);

namespace app\infrastructure\persistence;

use app\domain\service\Service;
use app\domain\service\ServiceId;
use app\domain\service\ServiceName;
use app\domain\service\ServiceRepository;

/** Read-only: the host never inserts services, module migrations do. */
final class ArServiceRepository implements ServiceRepository
{
    public function findByName(ServiceName $name): ?Service
    {
        $record = ServiceRecord::findOne(['name' => $name->value]);

        return $record === null
            ? null
            : Service::restore(new ServiceId((int) $record->id), new ServiceName($record->name));
    }
}
