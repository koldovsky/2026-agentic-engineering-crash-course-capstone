<?php

declare(strict_types=1);

namespace app\modules\mail_service\domain;

final class InvalidInitRequest extends \DomainException
{
    /** @param list<array{field: string, message: string}> $errors */
    public function __construct(public readonly array $errors)
    {
        parent::__construct('The init request is invalid.');
    }
}
