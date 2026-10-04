<?php

declare(strict_types=1);

namespace app\infrastructure\persistence;

use app\domain\process\EmulatedProcessId;
use app\domain\process\ServiceMethod;
use yii\behaviors\TimestampBehavior;
use yii\db\ActiveRecord;

/**
 * Persistence model of table `emulator_process`; no business logic (the rules live in
 * app\domain\process\EmulatorProcess).
 *
 * @property int $id
 * @property string $service_method
 * @property string $process_id
 * @property string $status
 * @property int $created_at
 * @property int $updated_at
 */
final class EmulatorProcessRecord extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%emulator_process}}';
    }

    public function behaviors(): array
    {
        return [TimestampBehavior::class];
    }

    public function rules(): array
    {
        return [
            [['service_method', 'process_id', 'status'], 'required'],
            ['service_method', 'string', 'max' => ServiceMethod::MAX_LENGTH],
            ['process_id', 'string', 'max' => EmulatedProcessId::MAX_LENGTH],
            ['status', 'string', 'max' => 32],
        ];
    }
}
