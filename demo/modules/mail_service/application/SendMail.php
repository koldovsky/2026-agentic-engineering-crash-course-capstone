<?php

declare(strict_types=1);

namespace app\modules\mail_service\application;

use app\domain\process\Status;
use app\modules\mail_service\domain\InvalidMailRequest;
use app\modules\mail_service\domain\MailData;
use app\modules\mail_service\domain\RemoteServiceClient;
use app\modules\mail_service\domain\RequestBodyBuilder;
use app\modules\mail_service\domain\StatusMapper;

/** Init process of the methods general and process: sends the mail request to the remote service. */
final class SendMail
{
    public const REMOTE_PATH = '/init-process';

    public function __construct(
        private readonly RemoteServiceClient $client,
        private readonly RequestBodyBuilder $bodies,
        private readonly StatusMapper $statuses,
    ) {
    }

    /**
     * @param array<string, mixed> $data the `data` of the init request
     * @return array{externalId: string, status: Status, response: array<string, mixed>}
     * @throws InvalidMailRequest invalid data or an answer without the process id
     * @throws \RuntimeException the remote service could not be reached or answered with an error
     */
    public function execute(string $requestId, string $serviceMethod, array $data): array
    {
        $body = $this->bodies->build($requestId, $serviceMethod, MailData::fromArray($data));
        $response = $this->client->send(self::REMOTE_PATH, 'POST', $body);

        $externalId = $response['id'] ?? null;
        if (!is_string($externalId) || $externalId === '') {
            throw new InvalidMailRequest('The remote service answered without a process id.');
        }

        return [
            'externalId' => $externalId,
            'status' => $this->statuses->fromResponse($response['status'] ?? null),
            'response' => $response,
        ];
    }
}
