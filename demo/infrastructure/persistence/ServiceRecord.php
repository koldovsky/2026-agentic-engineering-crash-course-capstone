<?php

declare(strict_types=1);

namespace app\infrastructure\persistence;

use app\domain\service\ServiceName;
use yii\behaviors\TimestampBehavior;
use yii\db\ActiveRecord;

/**
 * Persistence model of table `service`; no business logic (the rules live in app\domain\service\Service).
 *
 * @property int $id
 * @property string $name
 * @property int $created_at
 * @property int $updated_at
 */
final class ServiceRecord extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%service}}';
    }

    public function behaviors(): array
    {
        return [TimestampBehavior::class];
    }

    public function rules(): array
    {
        return [
            ['name', 'required'],
            ['name', 'string', 'max' => ServiceName::MAX_LENGTH],
        ];
    }
}
