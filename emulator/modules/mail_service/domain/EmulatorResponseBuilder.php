<?php

declare(strict_types=1);

namespace app\modules\mail_service\domain;

use app\domain\process\EmulatedProcessId;

final class EmulatorResponseBuilder
{
    /** @return array{id: string, status: string} EMU-5 */
    public function initProcess(EmulatedProcessId $processId, RemoteStatus $status): array
    {
        return ['id' => $processId->value, 'status' => $status->value];
    }
}
