<?php

namespace Tests\Feature;

use Tests\TestCase;

class SampleWordsCommandTest extends TestCase
{
    public function test_prints_word_counts_table_in_service_order(): void
    {
        $this->artisan('sample:words', ['text' => 'Hi, there! Hi.'])
            ->expectsTable(['Word', 'Count'], [['hi', 2], ['there', 1]])
            ->assertExitCode(0);
    }

    public function test_prints_cyrillic_word_counts(): void
    {
        $this->artisan('sample:words', ['text' => 'Привіт, привіт світ'])
            ->expectsTable(['Word', 'Count'], [['привіт', 2], ['світ', 1]])
            ->assertExitCode(0);
    }

    public function test_prints_message_when_no_words_found(): void
    {
        $this->artisan('sample:words', ['text' => '?!...'])
            ->expectsOutput('No words found.')
            ->assertExitCode(0);
    }
}
