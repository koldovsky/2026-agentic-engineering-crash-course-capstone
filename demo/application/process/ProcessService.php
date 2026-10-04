<?php

declare(strict_types=1);

namespace app\application\process;

use app\domain\process\DuplicateExternalId;
use app\domain\process\DuplicateRequestId;
use app\domain\process\ExternalId;
use app\domain\process\Process;
use app\domain\process\ProcessNotFound;
use app\domain\process\ProcessRepository;
use app\domain\process\RequestId;
use app\domain\process\ServiceMethod;
use app\domain\service\ServiceId;
use app\domain\service\ServiceName;
use app\domain\service\ServiceNotRegistered;
use app\domain\service\ServiceRepository;

/** Lifecycle of a process as the shared flow of BaseController needs it; the rules live in Process. */
final class ProcessService
{
    public function __construct(
        private readonly ProcessRepository $processes,
        private readonly ServiceRepository $services,
    ) {
    }

    /**
     * Stores the process (status init) before the module talks to the remote service.
     *
     * @param array<string, mixed> $incomingData the init request body
     * @throws ServiceNotRegistered
     * @throws DuplicateRequestId
     */
    public function start(
        ServiceName $service,
        RequestId $requestId,
        ServiceMethod $serviceMethod,
        array $incomingData,
    ): Process {
        $serviceId = $this->serviceId($service);
        if ($this->processes->existsByRequestId($requestId)) {
            throw new DuplicateRequestId($requestId);
        }
        $process = Process::start($requestId, $serviceId, $serviceMethod, $incomingData);
        $this->processes->save($process);

        return $process;
    }

    /**
     * @throws ServiceNotRegistered
     * @throws ProcessNotFound
     */
    public function getByExternalId(ServiceName $service, ExternalId $externalId): Process
    {
        return $this->processes->findByExternalId($this->serviceId($service), $externalId)
            ?? throw new ProcessNotFound($externalId);
    }

    /**
     * @throws DuplicateRequestId
     * @throws DuplicateExternalId
     */
    public function save(Process $process): void
    {
        $this->processes->save($process);
    }

    /** Our own processing failed: record status error, dropping an external id the service already has. */
    public function recordError(Process $process): void
    {
        $process->markError();
        $id = $process->id();
        if ($id === null) {
            return;
        }

        try {
            $this->processes->save($process);
        } catch (DuplicateExternalId) {
            $stored = $this->processes->findById($id) ?? throw new \RuntimeException(
                sprintf('Process %d no longer exists.', $id)
            );
            $stored->markError();
            $this->processes->save($stored);
        }
    }

    private function serviceId(ServiceName $name): ServiceId
    {
        return $this->services->findByName($name)?->id() ?? throw new ServiceNotRegistered($name);
    }
}
