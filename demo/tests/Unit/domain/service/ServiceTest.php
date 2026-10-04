<?php

declare(strict_types=1);

namespace app\tests\Unit\domain\service;

use app\domain\service\InvalidServiceValue;
use app\domain\service\Service;
use app\domain\service\ServiceId;
use app\domain\service\ServiceName;
use Codeception\Test\Unit;

final class ServiceTest extends Unit
{
    public function testServiceNameAcceptsModuleIds(): void
    {
        foreach (['test', 'pay_v2', 'a_b1'] as $value) {
            $this->assertSame($value, (new ServiceName($value))->value);
        }
    }

    public function testServiceNameRejectsInvalidValues(): void
    {
        $invalid = ['', str_repeat('a', ServiceName::MAX_LENGTH + 1), 'Test', '1abc', 'a b', 'a/b', 'pay-v2'];
        foreach ($invalid as $value) {
            try {
                new ServiceName($value);
                $this->fail('Expected InvalidServiceValue for "' . $value . '".');
            } catch (InvalidServiceValue $e) {
                $this->assertSame('service', $e->field);
            }
        }
    }

    public function testServiceIdRejectsNonPositive(): void
    {
        foreach ([0, -1] as $value) {
            try {
                new ServiceId($value);
                $this->fail('Expected InvalidServiceValue for ' . $value . '.');
            } catch (InvalidServiceValue $e) {
                $this->assertSame('service_id', $e->field);
            }
        }
        $this->assertSame(1, (new ServiceId(1))->value);
    }

    public function testRestoreKeepsIdAndNameAndEqualsComparesByValue(): void
    {
        $service = Service::restore(new ServiceId(3), new ServiceName('test'));

        $this->assertSame(3, $service->id()->value);
        $this->assertSame('test', $service->name()->value);
        $this->assertTrue($service->id()->equals(new ServiceId(3)));
        $this->assertFalse($service->id()->equals(new ServiceId(4)));
        $this->assertTrue($service->name()->equals(new ServiceName('test')));
        $this->assertFalse($service->name()->equals(new ServiceName('other')));
    }
}
