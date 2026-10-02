<?php

namespace App\Console\Commands;

use App\Services\SampleService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('sample:hello')]
#[Description('Print the SampleService greeting')]
class SampleHelloCommand extends Command
{
    public function handle(SampleService $service): int
    {
        $this->info($service->greet());

        return self::SUCCESS;
    }

    public function sample(mixed $arg): mixed
    {
        return $arg;
    }
}
