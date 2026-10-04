<?php

use yii\db\Migration;

/**
 * Table `process`: the progress of every process (docs/architecture/flow.md §4).
 */
class m260926_222943_init_process extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%process}}', [
            'id' => $this->primaryKey(),
            'request_id' => $this->string(64)->notNull(),
            'service_method' => $this->string(128)->notNull(),
            'external_id' => $this->string(128)->null(),
            'incoming_data' => $this->text()->notNull(),
            'status' => $this->string(16)->notNull(),
            'created_at' => $this->integer()->notNull(),
            'updated_at' => $this->integer()->notNull(),
        ]);
        $this->createIndex('idx-process-request_id', '{{%process}}', 'request_id', true);
        $this->createIndex('idx-process-external_id', '{{%process}}', 'external_id');
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%process}}');
    }
}
