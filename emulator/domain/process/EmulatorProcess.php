<?php

declare(strict_types=1);

namespace app\domain\process;

final class EmulatorProcess
{
    private function __construct(
        private ?int $id,
        private readonly ServiceMethod $serviceMethod,
        private readonly EmulatedProcessId $processId,
        private EmulatorStatus $status,
        private ?int $createdAt,
        private ?int $updatedAt,
    ) {
    }

    public static function open(ServiceMethod $serviceMethod): self
    {
        return new self(null, $serviceMethod, EmulatedProcessId::generate(), EmulatorStatus::Process, null, null);
    }

    public static function restore(
        int $id,
        ServiceMethod $serviceMethod,
        EmulatedProcessId $processId,
        EmulatorStatus $status,
        int $createdAt,
        int $updatedAt,
    ): self {
        return new self($id, $serviceMethod, $processId, $status, $createdAt, $updatedAt);
    }

    /** The emulated service may report any status in any order - that is what tests of the API need. */
    public function changeStatus(EmulatorStatus $status): bool
    {
        if ($this->status === $status) {
            return false;
        }
        $this->status = $status;

        return true;
    }

    public function recordPersisted(int $id, int $createdAt, int $updatedAt): void
    {
        if ($this->id !== null && $this->id !== $id) {
            throw new \LogicException('The identity of an emulator process never changes.');
        }
        $this->id = $id;
        $this->createdAt = $createdAt;
        $this->updatedAt = $updatedAt;
    }

    public function id(): ?int
    {
        return $this->id;
    }

    public function serviceMethod(): ServiceMethod
    {
        return $this->serviceMethod;
    }

    public function processId(): EmulatedProcessId
    {
        return $this->processId;
    }

    public function status(): EmulatorStatus
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
