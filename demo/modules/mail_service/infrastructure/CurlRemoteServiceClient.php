<?php

declare(strict_types=1);

namespace app\modules\mail_service\infrastructure;

use app\modules\mail_service\domain\RemoteServiceClient;
use JsonException;
use RuntimeException;

/** PHP curl client of the remote mail service; signs the raw JSON body with HMAC-SHA256 (flow.md 1b). */
final class CurlRemoteServiceClient implements RemoteServiceClient
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $apiKey,
        private readonly string $secretKey,
        private readonly int $timeoutSeconds = 10,
    ) {
    }

    public function send(string $path, string $httpMethod, array $body): array
    {
        if ($this->apiKey === '' || $this->secretKey === '') {
            throw new RuntimeException('The signature keys of the remote service are not configured.');
        }

        // encoded once: the signed string is exactly the string sent
        $json = json_encode($body, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $curl = curl_init(rtrim($this->baseUrl, '/') . $path);
        if ($curl === false) {
            throw new RuntimeException('Could not initialise curl.');
        }
        curl_setopt_array($curl, [
            CURLOPT_CUSTOMREQUEST => $httpMethod,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
                'X-Api-Key: ' . $this->apiKey,
                'X-Signature: ' . hash_hmac('sha256', $json, $this->secretKey),
            ],
        ]);

        $answer = curl_exec($curl);
        $error = curl_error($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);

        if (!is_string($answer)) {
            throw new RuntimeException('The remote service is unreachable: ' . $error);
        }
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException(sprintf('The remote service answered HTTP %d.', $status));
        }

        try {
            $decoded = json_decode($answer, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw new RuntimeException('The remote service answered with invalid JSON.', 0, $e);
        }
        if (!is_array($decoded)) {
            throw new RuntimeException('The remote service answer is not a JSON object.');
        }

        return $decoded;
    }
}
