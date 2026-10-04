<?php

use yii\db\Migration;

/**
 * Signature key pair of a service: service.api_key / service.secret_key (nullable - only signed modules set them,
 * in their own RegisterService migration).
 */
class m260927_180654_add_service_signature_keys extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->addColumn('{{%service}}', 'api_key', $this->string(64)->null()->after('name'));
        $this->addColumn('{{%service}}', 'secret_key', $this->string(64)->null()->after('api_key'));
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropColumn('{{%service}}', 'secret_key');
        $this->dropColumn('{{%service}}', 'api_key');
    }
}
