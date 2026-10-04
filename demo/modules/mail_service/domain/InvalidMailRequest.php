<?php

declare(strict_types=1);

namespace app\modules\mail_service\domain;

use InvalidArgumentException;

/** The init request (service method or its data) or an answer of the remote service is not valid. */
final class InvalidMailRequest extends InvalidArgumentException
{
}
