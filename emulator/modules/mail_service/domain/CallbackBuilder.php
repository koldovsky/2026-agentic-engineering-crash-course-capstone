<?php

declare(strict_types=1);

namespace app\modules\mail_service\domain;

use app\domain\process\EmulatedProcessId;

final class CallbackBuilder
{
    /** @return array{id: string, status: string, created_at: int, updated_at: int} EMU-6 */
    public function build(EmulatedProcessId $processId, RemoteStatus $status, int $createdAt, int $updatedAt): array
    {
        return [
            'id' => $processId->value,
            'status' => $status->value,
            'created_at' => $createdAt,
            'updated_at' => $updatedAt,
        ];
    }
}
