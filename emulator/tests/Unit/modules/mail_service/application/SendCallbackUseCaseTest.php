<?php

declare(strict_types=1);

namespace app\tests\Unit\modules\mail_service\application;

use app\domain\process\EmulatorProcess;
use app\domain\process\EmulatorStatus;
use app\domain\process\ServiceMethod;
use app\modules\mail_service\application\SendCallbackUseCase;
use app\modules\mail_service\domain\CallbackBuilder;
use Codeception\Test\Unit;

final class SendCallbackUseCaseTest extends Unit
{
    private const URL = 'http://demo.dev/mail_service/v1/callback';

    private InMemoryProcesses $processes;
    private RecordingSender $sender;
    private RecordingScheduler $scheduler;
    private SendCallbackUseCase $useCase;
    private string $processId;

    protected function _before(): void
    {
        $this->processes = new InMemoryProcesses();
        $this->sender = new RecordingSender();
        $this->scheduler = new RecordingScheduler();
        $this->useCase = new SendCallbackUseCase($this->processes, new CallbackBuilder(), $this->sender, $this->scheduler);

        $process = EmulatorProcess::open(new ServiceMethod('general'));
        $this->processes->save($process);
        $this->processId = $process->processId()->value;
    }

    public function testFinalStatusIsStoredAndSentToTheReceivedUrl(): void
    {
        $this->useCase->handle($this->processId, self::URL, ['Sended']);

        $this->assertSame(EmulatorStatus::Success, $this->processes->saved[$this->processId]->status());
        $this->assertSame(
            [[self::URL, ['id' => $this->processId, 'status' => 'Sended', 'created_at' => 1700000000, 'updated_at' => 1700000005]]],
            $this->sender->sent,
        );
        $this->assertSame([], $this->scheduler->scheduled);
    }

    public function testFailCallbackStoresFail(): void
    {
        $this->useCase->handle($this->processId, self::URL, ['Fail']);

        $this->assertSame(EmulatorStatus::Fail, $this->processes->saved[$this->processId]->status());
    }

    public function testRemainingStatusesAreScheduledAfterTheFirstIsSent(): void
    {
        $this->useCase->handle($this->processId, self::URL, ['Sending', 'Sended']);

        $this->assertSame('Sending', $this->sender->sent[0][1]['status']);
        $this->assertSame([[$this->processId, self::URL, ['Sended']]], $this->scheduler->scheduled);
    }

    public function testFailedDeliveryThrowsAndSchedulesNothing(): void
    {
        $this->sender->fail = true;

        try {
            $this->useCase->handle($this->processId, self::URL, ['Sending', 'Sended']);
            $this->fail('RuntimeException expected');
        } catch (\RuntimeException) {
            $this->assertSame([], $this->scheduler->scheduled);
        }
    }

    public function testUnknownProcessThrows(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->useCase->handle('missing', self::URL, ['Sended']);
    }
}
