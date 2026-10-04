<?php

declare(strict_types=1);

namespace app\modules\mail_service\application;

use app\domain\process\EmulatorProcess;
use app\domain\process\EmulatorProcessRepository;
use app\domain\process\ServiceMethod;
use app\modules\mail_service\domain\EmulatorResponseBuilder;
use app\modules\mail_service\domain\InitRequest;
use app\modules\mail_service\domain\RequestSignature;
use app\modules\mail_service\domain\Scenario;

final class InitProcessUseCase
{
    public function __construct(
        private readonly RequestSignature $signature,
        private readonly EmulatorProcessRepository $processes,
        private readonly EmulatorResponseBuilder $responses,
        private readonly CallbackScheduler $callbacks,
    ) {
    }

    /**
     * @param array<array-key, mixed> $body the parsed JSON body
     * @return array{id: string, status: string}
     * @throws UnauthorizedRequest
     * @throws \app\modules\mail_service\domain\InvalidInitRequest
     */
    public function handle(string $rawBody, ?string $apiKey, ?string $signature, array $body, Scenario $scenario): array
    {
        if (!$this->signature->isValid($apiKey, $signature, $rawBody)) {
            throw new UnauthorizedRequest('Invalid X-Api-Key or X-Signature.');
        }
        $request = InitRequest::fromArray($body);

        $process = EmulatorProcess::open(new ServiceMethod($request->service));
        // an answer that is final at once must not be stored as "process" (B.3.2)
        $process->changeStatus($scenario->responseStatus()->toEmulatorStatus());
        $this->processes->save($process);

        $callbackStatuses = array_map(static fn ($status) => $status->value, $scenario->callbackStatuses());
        if ($callbackStatuses !== []) {
            $this->callbacks->schedule($process->processId()->value, $request->callbackUrl, $callbackStatuses);
        }

        return $this->responses->initProcess($process->processId(), $scenario->responseStatus());
    }
}
