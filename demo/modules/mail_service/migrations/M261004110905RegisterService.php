<?php

declare(strict_types=1);

namespace app\modules\mail_service\migrations;

use yii\db\Migration;

/** Registers the service `mail_service` (with its signature key pair from the environment). */
final class M261004110905RegisterService extends Migration
{
    public function safeUp(): void
    {
        $this->insert('{{%service}}', [
            'name' => 'mail_service',
            'api_key' => getenv('MAIL_SERVICE_API_KEY') ?: null,
            'secret_key' => getenv('MAIL_SERVICE_SECRET_KEY') ?: null,
            'created_at' => time(),
            'updated_at' => time(),
        ]);
    }

    public function safeDown(): void
    {
        $this->delete('{{%service}}', ['name' => 'mail_service']);
    }
}
