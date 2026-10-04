<?php

declare(strict_types=1);

namespace app\modules\mail_service\domain;

/** Builds the body of the request to the remote service (module.service.yaml: remote_request.body). */
final class RequestBodyBuilder
{
    /** Callback endpoint of this module, sent to the remote service in every request (flow.md 1a). */
    public const CALLBACK_URL = 'http://demo.dev/mail_service/v1/callback';

    /** The service methods of the module; both have the same remote request. */
    public const SERVICE_METHODS = ['general', 'process'];

    /**
     * @return array{request_id: string, service: string, to: string, text: string, callback_url: string}
     * @throws InvalidMailRequest
     */
    public function build(string $requestId, string $serviceMethod, MailData $data): array
    {
        if (!in_array($serviceMethod, self::SERVICE_METHODS, true)) {
            throw new InvalidMailRequest(sprintf('Unknown service_method "%s".', $serviceMethod));
        }

        return [
            'request_id' => $requestId,
            'service' => $serviceMethod,
            'to' => $data->sendTo,
            'text' => $data->text,
            'callback_url' => self::CALLBACK_URL,
        ];
    }
}
