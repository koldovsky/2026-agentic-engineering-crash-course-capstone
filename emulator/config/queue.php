<?php

return [
    'class' => \yii\queue\amqp_interop\Queue::class,
    'host' => getenv('RABBITMQ_HOST'),
    'port' => (int) getenv('RABBITMQ_PORT'),
    'user' => getenv('RABBITMQ_USER'),
    'password' => getenv('RABBITMQ_PASSWORD'),
    'vhost' => getenv('RABBITMQ_VHOST') ?: '/',
    'queueName' => 'emulator_callbacks',
    'exchangeName' => 'emulator_callbacks_exchange',
];
