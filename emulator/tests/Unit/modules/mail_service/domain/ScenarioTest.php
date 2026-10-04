<?php

declare(strict_types=1);

namespace app\tests\Unit\modules\mail_service\domain;

use app\domain\process\EmulatorStatus;
use app\modules\mail_service\domain\RemoteStatus;
use app\modules\mail_service\domain\Scenario;
use Codeception\Test\Unit;

final class ScenarioTest extends Unit
{
    public function testScenariosFollowTheSpecTable(): void
    {
        $table = [
            [Scenario::SendedAtOnce, 'Sended', []],
            [Scenario::SendingThenSended, 'Sending', ['Sended']],
            [Scenario::SendingThenFail, 'Sending', ['Fail']],
            [Scenario::SendingSendingSended, 'Sending', ['Sending', 'Sended']],
            [Scenario::FailAtOnce, 'Fail', []],
            [Scenario::UnmappedValue, 'Unknown', []],
        ];
        foreach ($table as [$scenario, $response, $callbacks]) {
            $this->assertSame($response, $scenario->responseStatus()->value);
            $this->assertSame($callbacks, array_map(static fn ($s) => $s->value, $scenario->callbackStatuses()));
        }
    }

    public function testRemoteStatusMapsToEmulatorStatus(): void
    {
        $this->assertSame(EmulatorStatus::Success, RemoteStatus::Sended->toEmulatorStatus());
        $this->assertSame(EmulatorStatus::Process, RemoteStatus::Sending->toEmulatorStatus());
        $this->assertSame(EmulatorStatus::Fail, RemoteStatus::Fail->toEmulatorStatus());
        $this->assertSame(EmulatorStatus::Fail, RemoteStatus::Unknown->toEmulatorStatus());
    }
}
