<?php

declare(strict_types=1);

namespace app\domain\process;

use app\domain\service\ServiceId;

interface ProcessRepository
{
    public function existsByRequestId(RequestId $requestId): bool;

    /** External ids are unique per service. */
    public function findByExternalId(ServiceId $serviceId, ExternalId $externalId): ?Process;

    /** The stored version, e.g. to record an error after a failed save. */
    public function findById(int $id): ?Process;

    /**
     * Inserts or updates and records the assigned id and timestamps on the entity.
     *
     * @throws DuplicateRequestId when another process has the same request id
     * @throws DuplicateExternalId when another process of the same service has the same external id
     */
    public function save(Process $process): void;
}
