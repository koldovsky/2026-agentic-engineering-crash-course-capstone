<?php

namespace App\Services;

class WordCountService
{
    /**
     * @return array<string, int>
     */
    public function countWords(string $text): array
    {
        preg_match_all('/[\p{L}\p{N}]+/u', $text, $matches);

        $counts = [];
        foreach ($matches[0] as $word) {
            $word = mb_strtolower($word);
            $counts[$word] = ($counts[$word] ?? 0) + 1;
        }

        // arsort is stable since PHP 8.0, so ties keep first-appearance order.
        arsort($counts);

        return $counts;
    }
}
