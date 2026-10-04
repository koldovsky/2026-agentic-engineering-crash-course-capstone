<?php

declare(strict_types=1);

namespace app\modules\mail_service\domain;

use app\domain\process\EmulatorStatus;

/** The status vocabulary of the emulated mail service (what it puts into `status`). */
enum RemoteStatus: string
{
    case Sended = 'Sended';
    case Sending = 'Sending';
    case Fail = 'Fail';
    case Unknown = 'Unknown';

    public function toEmulatorStatus(): EmulatorStatus
    {
        return match ($this) {
            self::Sended => EmulatorStatus::Success,
            self::Sending => EmulatorStatus::Process,
            self::Fail, self::Unknown => EmulatorStatus::Fail,
        };
    }
}
