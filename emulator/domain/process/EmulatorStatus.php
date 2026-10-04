<?php

declare(strict_types=1);

namespace app\domain\process;

enum EmulatorStatus: string
{
    case Success = 'success';
    case Process = 'process';
    case Fail = 'fail';
}
