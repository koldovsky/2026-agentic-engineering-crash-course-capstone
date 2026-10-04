<?php

declare(strict_types=1);

namespace app\infrastructure\persistence;

use app\domain\process\DuplicateExternalId;
use app\domain\process\DuplicateRequestId;
use app\domain\process\ExternalId;
use app\domain\process\Process;
use app\domain\process\ProcessRepository;
use app\domain\process\RequestId;
use app\domain\process\ServiceMethod;
use app\domain\process\Status;
use app\domain\service\ServiceId;
use yii\db\IntegrityException;
use yii\helpers\Json;

final class ArProcessRepository implements ProcessRepository
{
    public function existsByRequestId(RequestId $requestId): bool
    {
        return ProcessRecord::find()->where(['request_id' => $requestId->value])->exists();
    }

    public function findByExternalId(ServiceId $serviceId, ExternalId $externalId): ?Process
    {
        $record = ProcessRecord::findOne(['service_id' => $serviceId->value, 'external_id' => $externalId->value]);

        return $record === null ? null : $this->toDomain($record);
    }

    public function findById(int $id): ?Process
    {
        $record = ProcessRecord::findOne(['id' => $id]);

        return $record === null ? null : $this->toDomain($record);
    }

    public function save(Process $process): void
    {
        $id = $process->id();
        if ($id === null) {
            $record = new ProcessRecord();
        } else {
            $record = ProcessRecord::findOne(['id' => $id])
                ?? throw new \RuntimeException(sprintf('Process %d no longer exists.', $id));
        }

        $record->service_id = $process->serviceId()->value;
        $record->request_id = $process->requestId()->value;
        $record->service_method = $process->serviceMethod()->value;
        $record->incoming_data = Json::encode($process->incomingData());
        $record->external_id = $process->externalId()?->value;
        $record->status = $process->status()->value;
        $isInsert = $record->getIsNewRecord();

        try {
            if (!$record->save()) {
                throw new \RuntimeException('Process not saved: ' . Json::encode($record->getFirstErrors()));
            }
        } catch (IntegrityException $e) {
            // the unique indexes close the race between a check and the write
            if ($isInsert && $this->existsByRequestId($process->requestId())) {
                throw new DuplicateRequestId($process->requestId(), $e);
            }
            $externalId = $process->externalId();
            if ($externalId !== null && $this->otherHasExternalId($process, $externalId, $isInsert ? null : $id)) {
                throw new DuplicateExternalId($process->serviceId(), $externalId, $e);
            }
            throw $e;
        }

        $process->recordPersisted((int) $record->id, (int) $record->created_at, (int) $record->updated_at);
    }

    private function otherHasExternalId(Process $process, ExternalId $externalId, ?int $ownId): bool
    {
        $query = ProcessRecord::find()->where([
            'service_id' => $process->serviceId()->value,
            'external_id' => $externalId->value,
        ]);
        if ($ownId !== null) {
            $query->andWhere(['<>', 'id', $ownId]);
        }

        return $query->exists();
    }

    private function toDomain(ProcessRecord $record): Process
    {
        return Process::restore(
            (int) $record->id,
            new RequestId($record->request_id),
            new ServiceId((int) $record->service_id),
            new ServiceMethod($record->service_method),
            Json::decode($record->incoming_data),
            $record->external_id === null ? null : new ExternalId($record->external_id),
            Status::from($record->status),
            (int) $record->created_at,
            (int) $record->updated_at,
        );
    }
}
