<?php

declare(strict_types=1);

namespace app\infrastructure\persistence;

use app\domain\process\ExternalId;
use app\domain\process\RequestId;
use app\domain\process\ServiceMethod;
use yii\behaviors\TimestampBehavior;
use yii\db\ActiveRecord;

/**
 * Persistence model of table `process`; no business logic (the rules live in app\domain\process\Process).
 *
 * @property int $id
 * @property int $service_id
 * @property string $request_id
 * @property string $service_method
 * @property string|null $external_id
 * @property string $incoming_data JSON
 * @property string $status
 * @property int $created_at
 * @property int $updated_at
 */
final class ProcessRecord extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%process}}';
    }

    public function behaviors(): array
    {
        return [TimestampBehavior::class];
    }

    public function rules(): array
    {
        return [
            [['service_id', 'request_id', 'service_method', 'incoming_data', 'status'], 'required'],
            ['service_id', 'integer'],
            ['request_id', 'string', 'max' => RequestId::MAX_LENGTH],
            ['service_method', 'string', 'max' => ServiceMethod::MAX_LENGTH],
            ['external_id', 'string', 'max' => ExternalId::MAX_LENGTH],
            ['incoming_data', 'string'],
            ['status', 'string', 'max' => 16],
        ];
    }
}
