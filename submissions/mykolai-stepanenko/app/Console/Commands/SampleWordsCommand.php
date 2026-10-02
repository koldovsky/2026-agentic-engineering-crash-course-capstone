<?php

namespace App\Console\Commands;

use App\Services\WordCountService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('sample:words {text : Text to count words in}')]
#[Description('Print how many times each word occurs in the text')]
class SampleWordsCommand extends Command
{
    public function handle(WordCountService $service): int
    {
        $counts = $service->countWords((string) $this->argument('text'));

        if ($counts === []) {
            $this->info('No words found.');

            return self::SUCCESS;
        }

        $rows = [];
        foreach ($counts as $word => $count) {
            $rows[] = [(string) $word, $count];
        }
        $this->table(['Word', 'Count'], $rows);

        return self::SUCCESS;
    }
}
