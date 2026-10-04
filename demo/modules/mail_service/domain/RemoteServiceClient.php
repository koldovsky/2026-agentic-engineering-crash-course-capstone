<?php

declare(strict_types=1);

namespace app\modules\mail_service\domain;

/** Port to the remote mail service; the implementation lives in infrastructure (anti-corruption layer). */
interface RemoteServiceClient
{
    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed> the decoded JSON answer
     * @throws \RuntimeException on a transport error, a non-2xx answer or a body that is not a JSON object
     */
    public function send(string $path, string $httpMethod, array $body): array;
}
