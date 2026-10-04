<?php

declare(strict_types=1);

namespace app\domain\process;

final class ProcessNotFound extends \DomainException
{
    public function __construct(ExternalId $externalId)
    {
        parent::__construct(sprintf('No process with external id "%s".', $externalId->value));
    }
}
