<?php

declare(strict_types=1);

namespace app\tests\Unit\domain\process;

use app\domain\process\ExternalId;
use app\domain\process\InvalidProcessValue;
use app\domain\process\Process;
use app\domain\process\RequestId;
use app\domain\process\ServiceMethod;
use app\domain\process\Status;
use app\domain\service\ServiceId;
use Codeception\Test\Unit;

final class ProcessTest extends Unit
{
    private function startProcess(): Process
    {
        return Process::start(
            new RequestId('r-1'),
            new ServiceId(1),
            new ServiceMethod('pay'),
            ['requestId' => 'r-1']
        );
    }

    public function testStartedProcess(): void
    {
        $process = $this->startProcess();

        $this->assertSame(Status::Init, $process->status());
        $this->assertSame(1, $process->serviceId()->value);
        $this->assertNull($process->externalId());
        $this->assertNull($process->id());
        $this->assertSame(['requestId' => 'r-1'], $process->incomingData());
    }

    public function testChangeStatusAppliesDifferentStatus(): void
    {
        $process = $this->startProcess();

        $this->assertTrue($process->changeStatus(Status::Process));
        $this->assertSame(Status::Process, $process->status());
    }

    public function testSameStatusChangesNothing(): void
    {
        $process = $this->startProcess();
        $process->changeStatus(Status::Process);

        $this->assertFalse($process->changeStatus(Status::Process));
        $this->assertSame(Status::Process, $process->status());
    }

    public function testCallbackStatusReplacesFinalOne(): void
    {
        $process = $this->startProcess();
        $process->changeStatus(Status::Fail);

        $this->assertTrue($process->changeStatus(Status::Success));
        $this->assertSame(Status::Success, $process->status());
    }

    public function testStatusAppliesAfterError(): void
    {
        $process = $this->startProcess();
        $process->markError();
        $this->assertSame(Status::Error, $process->status());

        $this->assertTrue($process->changeStatus(Status::Success));
        $this->assertSame(Status::Success, $process->status());
    }

    public function testHostOnlyStatusesAreRejected(): void
    {
        $process = $this->startProcess();

        $this->expectException(\InvalidArgumentException::class);
        $process->changeStatus(Status::Error);
    }

    public function testInitStatusIsRejected(): void
    {
        $process = $this->startProcess();

        $this->expectException(\InvalidArgumentException::class);
        $process->changeStatus(Status::Init);
    }

    public function testAssignExternalId(): void
    {
        $process = $this->startProcess();
        $process->assignExternalId(new ExternalId('ext-1'));

        $this->assertSame('ext-1', $process->externalId()?->value);
    }

    public function testRecordPersistedKeepsIdentity(): void
    {
        $process = $this->startProcess();
        $process->recordPersisted(5, 100, 100);
        $process->recordPersisted(5, 100, 200);

        $this->assertSame(5, $process->id());
        $this->assertSame(100, $process->createdAt());
        $this->assertSame(200, $process->updatedAt());

        $this->expectException(\LogicException::class);
        $process->recordPersisted(6, 100, 300);
    }

    public function testValueObjectsRejectEmptyValues(): void
    {
        $this->expectException(InvalidProcessValue::class);
        new RequestId('  ');
    }

    public function testValueObjectsRejectTooLongValuesAndNameTheField(): void
    {
        try {
            new ServiceMethod(str_repeat('a', ServiceMethod::MAX_LENGTH + 1));
            $this->fail('Expected InvalidProcessValue.');
        } catch (InvalidProcessValue $e) {
            $this->assertSame('service_method', $e->field);
        }
    }

    public function testOnlyMappableStatuses(): void
    {
        $this->assertTrue(Status::Success->isMappable());
        $this->assertTrue(Status::Process->isMappable());
        $this->assertTrue(Status::Fail->isMappable());
        $this->assertFalse(Status::Init->isMappable());
        $this->assertFalse(Status::Error->isMappable());
    }
}
