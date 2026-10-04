<?php

declare(strict_types=1);

namespace app\domain\process;

final class Text
{
    public static function assertValid(string $value, int $maxLength, string $field): void
    {
        if (trim($value) === '') {
            throw InvalidEmulatorValue::empty($field);
        }
        if (mb_strlen($value) > $maxLength) {
            throw InvalidEmulatorValue::tooLong($field, $maxLength);
        }
    }
}
