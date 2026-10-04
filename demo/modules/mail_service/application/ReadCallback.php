<?php

declare(strict_types=1);

namespace app\modules\mail_service\application;

use app\domain\process\Status;
use app\modules\mail_service\domain\StatusMapper;

/** Reads the callback body of the remote service: the process id and our status. */
final class ReadCallback
{
    public function __construct(private readonly StatusMapper $statuses)
    {
    }

    /**
     * @param array<string, mixed> $body
     * @return string the external id, '' when the body has none
     */
    public function externalId(array $body): string
    {
        $id = $body['id'] ?? null;

        return is_string($id) || is_int($id) ? (string) $id : '';
    }

    /**
     * @param array<string, mixed> $body
     */
    public function status(array $body): Status
    {
        return $this->statuses->fromCallback($body['status'] ?? null);
    }
}
