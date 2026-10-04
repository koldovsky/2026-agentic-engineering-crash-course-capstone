<?php

declare(strict_types=1);

namespace app\modules\mail_service\domain;

use app\domain\process\Status;

/**
 * Maps a remote status to ours (module.service.yaml: status_map). The response and the callback of both service
 * methods use one table; a value outside it is the spec's default_status: fail.
 */
final class StatusMapper
{
    private const MAP = [
        'Sended' => Status::Success,
        'Sending' => Status::Process,
        'Fail' => Status::Fail,
    ];

    public function fromResponse(mixed $remoteStatus): Status
    {
        return $this->map($remoteStatus);
    }

    public function fromCallback(mixed $remoteStatus): Status
    {
        return $this->map($remoteStatus);
    }

    private function map(mixed $remoteStatus): Status
    {
        return is_string($remoteStatus) ? (self::MAP[$remoteStatus] ?? Status::Fail) : Status::Fail;
    }
}
