<?php

declare(strict_types=1);

namespace app\domain\process;

use app\domain\service\ServiceId;

final class DuplicateExternalId extends \DomainException
{
    public function __construct(ServiceId $serviceId, ExternalId $externalId, ?\Throwable $previous = null)
    {
        parent::__construct(
            sprintf('Service %d already has a process with external id "%s".', $serviceId->value, $externalId->value),
            0,
            $previous
        );
    }
}
