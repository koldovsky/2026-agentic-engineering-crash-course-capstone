<?php

declare(strict_types=1);

namespace app\tests\Unit\modules\mail_service\application;

use app\domain\process\EmulatorStatus;
use app\modules\mail_service\application\InitProcessUseCase;
use app\modules\mail_service\application\UnauthorizedRequest;
use app\modules\mail_service\domain\EmulatorResponseBuilder;
use app\modules\mail_service\domain\InvalidInitRequest;
use app\modules\mail_service\domain\RequestSignature;
use app\modules\mail_service\domain\Scenario;
use Codeception\Test\Unit;

final class InitProcessUseCaseTest extends Unit
{
    private const CALLBACK_URL = 'http://demo.dev/mail_service/v1/callback';

    private InMemoryProcesses $processes;
    private RecordingScheduler $scheduler;
    private InitProcessUseCase $useCase;

    protected function _before(): void
    {
        $this->processes = new InMemoryProcesses();
        $this->scheduler = new RecordingScheduler();
        $this->useCase = new InitProcessUseCase(
            new RequestSignature('key', 'secret'),
            $this->processes,
            new EmulatorResponseBuilder(),
            $this->scheduler,
        );
    }

    /**
     * @param array<string, mixed> $override
     * @return array{id: string, status: string}
     */
    private function call(Scenario $scenario, array $override = [], ?string $apiKey = 'key'): array
    {
        $body = $override + [
            'request_id' => '1',
            'service' => 'general',
            'to' => 'user@example.com',
            'text' => 'Hello',
            'callback_url' => self::CALLBACK_URL,
        ];
        $raw = json_encode($body);

        return $this->useCase->handle($raw, $apiKey, hash_hmac('sha256', $raw, 'secret'), $body, $scenario);
    }

    public function testSendedAtOnceIsStoredFinalAndSchedulesNoCallback(): void
    {
        $response = $this->call(Scenario::SendedAtOnce);

        $this->assertSame('Sended', $response['status']);
        $process = array_values($this->processes->saved)[0];
        $this->assertSame($response['id'], $process->processId()->value);
        $this->assertSame(EmulatorStatus::Success, $process->status());
        $this->assertSame('general', $process->serviceMethod()->value);
        $this->assertSame([], $this->scheduler->scheduled);
    }

    public function testFailAtOnceIsStoredAsFail(): void
    {
        $this->call(Scenario::FailAtOnce, ['service' => 'process']);

        $process = array_values($this->processes->saved)[0];
        $this->assertSame(EmulatorStatus::Fail, $process->status());
        $this->assertSame('process', $process->serviceMethod()->value);
    }

    public function testSendingSchedulesTheCallbackToTheReceivedUrl(): void
    {
        $response = $this->call(Scenario::SendingSendingSended);

        $this->assertSame('Sending', $response['status']);
        $this->assertSame(EmulatorStatus::Process, array_values($this->processes->saved)[0]->status());
        $this->assertSame(
            [[$response['id'], self::CALLBACK_URL, ['Sending', 'Sended']]],
            $this->scheduler->scheduled,
        );
    }

    public function testProcessIdsNeverRepeat(): void
    {
        $this->assertNotSame($this->call(Scenario::SendedAtOnce)['id'], $this->call(Scenario::SendedAtOnce)['id']);
    }

    public function testBadSignatureIsRejectedBeforeAnythingIsSaved(): void
    {
        try {
            $this->call(Scenario::SendedAtOnce, [], 'wrong-key');
            $this->fail('UnauthorizedRequest expected');
        } catch (UnauthorizedRequest) {
            $this->assertSame([], $this->processes->saved);
        }
    }

    public function testInvalidBodyIsRejectedAndNothingIsSaved(): void
    {
        try {
            $this->call(Scenario::SendingThenSended, ['to' => '']);
            $this->fail('InvalidInitRequest expected');
        } catch (InvalidInitRequest) {
            $this->assertSame([], $this->processes->saved);
            $this->assertSame([], $this->scheduler->scheduled);
        }
    }
}
