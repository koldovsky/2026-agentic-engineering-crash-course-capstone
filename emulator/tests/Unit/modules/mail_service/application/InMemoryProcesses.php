<?php

declare(strict_types=1);

namespace app\tests\Unit\modules\mail_service\application;

use app\domain\process\EmulatedProcessId;
use app\domain\process\EmulatorProcess;
use app\domain\process\EmulatorProcessRepository;

final class InMemoryProcesses implements EmulatorProcessRepository
{
    /** @var array<string, EmulatorProcess> */
    public array $saved = [];
    private int $nextId = 1;

    public function findByProcessId(EmulatedProcessId $processId): ?EmulatorProcess
    {
        return $this->saved[$processId->value] ?? null;
    }

    public function save(EmulatorProcess $process): void
    {
        $process->recordPersisted($process->id() ?? $this->nextId++, 1700000000, 1700000005);
        $this->saved[$process->processId()->value] = $process;
    }
}
