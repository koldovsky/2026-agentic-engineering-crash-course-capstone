<?php

declare(strict_types=1);

namespace app\tests\Unit\modules\mail_service\domain;

use app\domain\process\EmulatedProcessId;
use app\modules\mail_service\domain\CallbackBuilder;
use app\modules\mail_service\domain\EmulatorResponseBuilder;
use app\modules\mail_service\domain\RemoteStatus;
use Codeception\Test\Unit;

final class BuildersTest extends Unit
{
    public function testResponseCarriesProcessIdAndStatus(): void
    {
        $id = new EmulatedProcessId('abc123');

        $this->assertSame(
            ['id' => 'abc123', 'status' => 'Sending'],
            (new EmulatorResponseBuilder())->initProcess($id, RemoteStatus::Sending),
        );
    }

    public function testCallbackBodyHasTheFourDeclaredParams(): void
    {
        $id = new EmulatedProcessId('abc123');

        $this->assertSame(
            ['id' => 'abc123', 'status' => 'Sended', 'created_at' => 1700000000, 'updated_at' => 1700000005],
            (new CallbackBuilder())->build($id, RemoteStatus::Sended, 1700000000, 1700000005),
        );
    }
}
