<?php

use yii\db\Migration;

/**
 * Service registry: table `service` (one row per module, inserted by the module's own migration) and
 * `process.service_id`, with external ids unique per service (docs/architecture/flow.md §4).
 */
class m260927_012352_add_service_registry extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        if ((int) $this->db->createCommand('SELECT COUNT(*) FROM {{%process}}')->queryScalar() > 0) {
            throw new \RuntimeException('Table process has rows: assign them to a service before adding process.service_id.');
        }

        $this->createTable('{{%service}}', [
            'id' => $this->primaryKey(),
            'name' => $this->string(64)->notNull(),
            'created_at' => $this->integer()->notNull(),
            'updated_at' => $this->integer()->notNull(),
        ]);
        $this->createIndex('idx-service-name', '{{%service}}', 'name', true);

        $this->addColumn('{{%process}}', 'service_id', $this->integer()->notNull()->after('id'));

        $this->dropIndex('idx-process-external_id', '{{%process}}');
        // unique per service; MySQL allows many NULL external ids (processes in init)
        $this->createIndex('idx-process-service_id-external_id', '{{%process}}', ['service_id', 'external_id'], true);

        $this->addForeignKey('fk-process-service_id', '{{%process}}', 'service_id', '{{%service}}', 'id', 'RESTRICT', 'CASCADE');
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropForeignKey('fk-process-service_id', '{{%process}}');
        $this->dropIndex('idx-process-service_id-external_id', '{{%process}}');
        $this->createIndex('idx-process-external_id', '{{%process}}', 'external_id');
        $this->dropColumn('{{%process}}', 'service_id');
        $this->dropTable('{{%service}}');
    }
}
