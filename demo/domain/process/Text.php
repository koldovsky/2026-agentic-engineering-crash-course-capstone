<?php

declare(strict_types=1);

namespace app\domain\process;

/** Shared validation of the string value objects. */
final class Text
{
    public static function assertValid(string $value, int $maxLength, string $field): void
    {
        if (trim($value) === '') {
            throw InvalidProcessValue::empty($field);
        }
        if (mb_strlen($value) > $maxLength) {
            throw InvalidProcessValue::tooLong($field, $maxLength);
        }
    }
}
