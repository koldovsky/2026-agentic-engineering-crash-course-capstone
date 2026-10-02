<?php

namespace Tests\Unit\Services;

use App\Services\WordCountService;
use PHPUnit\Framework\TestCase;

class WordCountServiceTest extends TestCase
{
    public function test_counts_words_case_insensitively_with_lowercased_keys(): void
    {
        $this->assertSame(['hello' => 2], (new WordCountService)->countWords('Hello hello'));
    }

    public function test_punctuation_and_whitespace_separate_words(): void
    {
        $this->assertSame(['hi' => 2, 'there' => 1], (new WordCountService)->countWords('Hi, there! Hi.'));
    }

    public function test_counts_cyrillic_words(): void
    {
        $this->assertSame(['привіт' => 2, 'світ' => 1], (new WordCountService)->countWords('Привіт, привіт світ'));
    }

    public function test_digits_are_part_of_words(): void
    {
        $this->assertSame(['abc123' => 2, '42' => 1], (new WordCountService)->countWords('abc123 42 ABC123'));
    }

    public function test_orders_by_count_descending_then_by_first_appearance(): void
    {
        $this->assertSame(
            ['c' => 3, 'b' => 2, 'a' => 1, 'd' => 1],
            (new WordCountService)->countWords('a b c b c c d'),
        );
    }

    public function test_empty_text_returns_empty_array(): void
    {
        $this->assertSame([], (new WordCountService)->countWords(''));
    }

    public function test_punctuation_only_text_returns_empty_array(): void
    {
        $this->assertSame([], (new WordCountService)->countWords(' ,.!? -- ;; '));
    }
}
