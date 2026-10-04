<?php

declare(strict_types=1);

namespace app\modules\mail_service\application;

use app\domain\process\EmulatedProcessId;
use app\domain\process\EmulatorProcessRepository;
use app\modules\mail_service\domain\CallbackBuilder;
use app\modules\mail_service\domain\RemoteStatus;

/** EMU-6: run by the queue job, 5 seconds after it was scheduled. */
final class SendCallbackUseCase
{
    public function __construct(
        private readonly EmulatorProcessRepository $processes,
        private readonly CallbackBuilder $callbacks,
        private readonly CallbackSender $sender,
        private readonly CallbackScheduler $scheduler,
    ) {
    }

    /** @param non-empty-list<string> $statuses remote status values still to report; the first is reported now */
    public function handle(string $processId, string $callbackUrl, array $statuses): void
    {
        $id = new EmulatedProcessId($processId);
        $process = $this->processes->findByProcessId($id)
            ?? throw new \RuntimeException("Emulator process $processId not found.");

        $status = RemoteStatus::from(array_shift($statuses));
        $process->changeStatus($status->toEmulatorStatus());
        $this->processes->save($process);

        $this->sender->send(
            $callbackUrl,
            $this->callbacks->build($id, $status, (int) $process->createdAt(), (int) $process->updatedAt()),
        );

        if ($statuses !== []) {
            $this->scheduler->schedule($processId, $callbackUrl, $statuses);
        }
    }
}
