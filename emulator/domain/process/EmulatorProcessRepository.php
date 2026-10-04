<?php

declare(strict_types=1);

namespace app\domain\process;

interface EmulatorProcessRepository
{
    public function findByProcessId(EmulatedProcessId $processId): ?EmulatorProcess;

    /** Inserts or updates and records the assigned id and timestamps on the entity. */
    public function save(EmulatorProcess $process): void;
}
