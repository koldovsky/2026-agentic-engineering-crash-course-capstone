<?php

namespace Tests\Feature;

use Tests\TestCase;

class SampleHelloCommandTest extends TestCase
{
    public function test_command_prints_hello_world(): void
    {
        $this->artisan('sample:hello')
            ->expectsOutput('Hello world')
            ->assertExitCode(0);
    }
}
