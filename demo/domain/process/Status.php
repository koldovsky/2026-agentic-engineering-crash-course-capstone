<?php

declare(strict_types=1);

namespace app\domain\process;

enum Status: string
{
    case Init = 'init';
    case Success = 'success';
    case Process = 'process';
    case Fail = 'fail';
    case Error = 'error';

    /** The values a module may map to; init and error are set only by the host. */
    public function isMappable(): bool
    {
        return match ($this) {
            self::Success, self::Process, self::Fail => true,
            self::Init, self::Error => false,
        };
    }
}
