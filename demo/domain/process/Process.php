<?php

declare(strict_types=1);

namespace app\domain\process;

use app\domain\service\ServiceId;

/** Aggregate root: the progress of one request to a remote service (docs/architecture/flow.md). */
final class Process
{
    /**
     * @param array<string, mixed> $incomingData
     */
    private function __construct(
        private ?int $id,
        private readonly RequestId $requestId,
        private readonly ServiceId $serviceId,
        private readonly ServiceMethod $serviceMethod,
        private readonly array $incomingData,
        private ?ExternalId $externalId,
        private Status $status,
        private ?int $createdAt,
        private ?int $updatedAt,
    ) {
    }

    /**
     * @param array<string, mixed> $incomingData the init request body
     */
    public static function start(
        RequestId $requestId,
        ServiceId $serviceId,
        ServiceMethod $serviceMethod,
        array $incomingData,
    ): self {
        return new self(null, $requestId, $serviceId, $serviceMethod, $incomingData, null, Status::Init, null, null);
    }

    /**
     * @param array<string, mixed> $incomingData
     */
    public static function restore(
        int $id,
        RequestId $requestId,
        ServiceId $serviceId,
        ServiceMethod $serviceMethod,
        array $incomingData,
        ?ExternalId $externalId,
        Status $status,
        int $createdAt,
        int $updatedAt,
    ): self {
        return new self(
            $id,
            $requestId,
            $serviceId,
            $serviceMethod,
            $incomingData,
            $externalId,
            $status,
            $createdAt,
            $updatedAt
        );
    }

    public function assignExternalId(ExternalId $externalId): void
    {
        $this->externalId = $externalId;
    }

    /**
     * Applies a status of the remote service, also after a final one (the remote service has the last word).
     *
     * @return bool whether the status changed
     */
    public function changeStatus(Status $status): bool
    {
        if (!$status->isMappable()) {
            throw new \InvalidArgumentException(sprintf('Status "%s" is set only by the host.', $status->value));
        }
        if ($status === $this->status) {
            return false;
        }
        $this->status = $status;

        return true;
    }

    /** Our own processing failed. */
    public function markError(): void
    {
        $this->status = Status::Error;
    }

    /** For repositories, after a save. */
    public function recordPersisted(int $id, int $createdAt, int $updatedAt): void
    {
        if ($this->id !== null && $this->id !== $id) {
            throw new \LogicException('The identity of a process never changes.');
        }
        $this->id = $id;
        $this->createdAt = $createdAt;
        $this->updatedAt = $updatedAt;
    }

    public function id(): ?int
    {
        return $this->id;
    }

    public function requestId(): RequestId
    {
        return $this->requestId;
    }

    public function serviceId(): ServiceId
    {
        return $this->serviceId;
    }

    public function serviceMethod(): ServiceMethod
    {
        return $this->serviceMethod;
    }

    /**
     * @return array<string, mixed>
     */
    public function incomingData(): array
    {
        return $this->incomingData;
    }

    public function externalId(): ?ExternalId
    {
        return $this->externalId;
    }

    public function status(): Status
    {
        return $this->status;
    }

    public function createdAt(): ?int
    {
        return $this->createdAt;
    }

    public function updatedAt(): ?int
    {
        return $this->updatedAt;
    }
}
