<?php

namespace Tests\Unit\Services;

use App\Services\SampleService;
use PHPUnit\Framework\TestCase;

class SampleServiceTest extends TestCase
{
    public function test_greet_returns_hello_world(): void
    {
        $service = new SampleService;

        $this->assertSame('Hello world', $service->greet());
    }
}
