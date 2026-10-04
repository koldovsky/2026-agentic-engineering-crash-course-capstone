<?php

declare(strict_types=1);

namespace app\domain\process;

final class DuplicateRequestId extends \DomainException
{
    public function __construct(RequestId $requestId, ?\Throwable $previous = null)
    {
        parent::__construct(
            sprintf('A process with requestId "%s" already exists.', $requestId->value),
            0,
            $previous
        );
    }
}
