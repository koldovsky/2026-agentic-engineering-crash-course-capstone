<?php

use yii\db\Migration;

/**
 * Table `emulator_process`: the emulator's own process data (docs/architecture/flow.md §6).
 */
class m260926_231315_init_emulator_process extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%emulator_process}}', [
            'id' => $this->primaryKey(),
            'service_method' => $this->string(128)->notNull(),
            'process_id' => $this->string(128)->notNull(),
            'status' => $this->string(32)->notNull(),
            'created_at' => $this->integer()->notNull(),
            'updated_at' => $this->integer()->notNull(),
        ]);
        $this->createIndex(
            'idx-emulator_process-process_id',
            '{{%emulator_process}}',
            'process_id',
            true
        );
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%emulator_process}}');
    }
}
