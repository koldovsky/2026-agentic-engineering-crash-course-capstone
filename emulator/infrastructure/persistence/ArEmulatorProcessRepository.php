<?php

declare(strict_types=1);

namespace app\infrastructure\persistence;

use app\domain\process\EmulatedProcessId;
use app\domain\process\EmulatorProcess;
use app\domain\process\EmulatorProcessRepository;
use app\domain\process\EmulatorStatus;
use app\domain\process\ServiceMethod;
use yii\helpers\Json;

final class ArEmulatorProcessRepository implements EmulatorProcessRepository
{
    public function findByProcessId(EmulatedProcessId $processId): ?EmulatorProcess
    {
        $record = EmulatorProcessRecord::findOne(['process_id' => $processId->value]);

        return $record === null ? null : $this->toDomain($record);
    }

    public function save(EmulatorProcess $process): void
    {
        if ($process->id() === null) {
            $record = new EmulatorProcessRecord();
        } else {
            $record = EmulatorProcessRecord::findOne(['id' => $process->id()]);
            if ($record === null) {
                throw new \RuntimeException("Emulator process {$process->id()} no longer exists.");
            }
        }

        $record->service_method = $process->serviceMethod()->value;
        $record->process_id = $process->processId()->value;
        $record->status = $process->status()->value;

        if (!$record->save()) {
            throw new \RuntimeException('Emulator process not saved: ' . Json::encode($record->getFirstErrors()));
        }

        $process->recordPersisted((int) $record->id, (int) $record->created_at, (int) $record->updated_at);
    }

    private function toDomain(EmulatorProcessRecord $record): EmulatorProcess
    {
        return EmulatorProcess::restore(
            (int) $record->id,
            new ServiceMethod($record->service_method),
            new EmulatedProcessId($record->process_id),
            EmulatorStatus::from($record->status),
            (int) $record->created_at,
            (int) $record->updated_at,
        );
    }
}
