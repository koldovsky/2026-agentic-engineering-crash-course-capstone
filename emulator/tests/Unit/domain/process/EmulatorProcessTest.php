<?php

declare(strict_types=1);

namespace app\tests\Unit\domain\process;

use app\domain\process\EmulatedProcessId;
use app\domain\process\EmulatorProcess;
use app\domain\process\EmulatorStatus;
use app\domain\process\InvalidEmulatorValue;
use app\domain\process\ServiceMethod;
use Codeception\Test\Unit;

final class EmulatorProcessTest extends Unit
{
    public function testOpenedProcessStartsInProcessStatus(): void
    {
        $process = $this->openProcess();

        $this->assertSame(EmulatorStatus::Process, $process->status());
        $this->assertNull($process->id());
        $this->assertMatchesRegularExpression('/^[0-9a-f]{32}$/', $process->processId()->value);
    }

    public function testOpenedProcessesGetDifferentProcessIds(): void
    {
        $this->assertFalse($this->openProcess()->processId()->equals($this->openProcess()->processId()));
    }

    public function testChangeStatusAppliesDifferentStatusOnly(): void
    {
        $process = $this->openProcess();

        $this->assertTrue($process->changeStatus(EmulatorStatus::Success));
        $this->assertFalse($process->changeStatus(EmulatorStatus::Success));
        $this->assertSame(EmulatorStatus::Success, $process->status());
    }

    public function testAnyStatusCanFollowAnyOther(): void
    {
        $process = $this->openProcess();

        $this->assertTrue($process->changeStatus(EmulatorStatus::Success));
        $this->assertTrue($process->changeStatus(EmulatorStatus::Fail));
        $this->assertTrue($process->changeStatus(EmulatorStatus::Process));
        $this->assertSame(EmulatorStatus::Process, $process->status());
    }

    public function testRecordPersistedKeepsIdentity(): void
    {
        $process = $this->openProcess();

        $process->recordPersisted(5, 100, 100);
        $process->recordPersisted(5, 100, 200);

        $this->assertSame(5, $process->id());
        $this->assertSame(200, $process->updatedAt());

        $this->expectException(\LogicException::class);
        $process->recordPersisted(6, 100, 200);
    }

    public function testValueObjectsRejectEmptyValues(): void
    {
        try {
            new ServiceMethod(' ');
            $this->fail('An empty service method must be rejected.');
        } catch (InvalidEmulatorValue $e) {
            $this->assertSame('service_method', $e->field);
            $this->assertSame('service_method must not be empty.', $e->getMessage());
        }
    }

    public function testValueObjectsRejectTooLongValues(): void
    {
        try {
            new EmulatedProcessId(str_repeat('a', EmulatedProcessId::MAX_LENGTH + 1));
            $this->fail('A too long process id must be rejected.');
        } catch (InvalidEmulatorValue $e) {
            $this->assertSame('process_id', $e->field);
        }

        $this->expectException(InvalidEmulatorValue::class);
        new ServiceMethod(str_repeat('a', ServiceMethod::MAX_LENGTH + 1));
    }

    private function openProcess(): EmulatorProcess
    {
        return EmulatorProcess::open(new ServiceMethod('pay'));
    }
}
