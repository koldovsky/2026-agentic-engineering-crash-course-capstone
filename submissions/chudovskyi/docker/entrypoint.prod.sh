#!/usr/bin/env bash

if [ -n "$APP_CONFIG__DB__HOST" ]
then
    echo "Waiting for postgres ($APP_CONFIG__DB__HOST:$APP_CONFIG__DB__PORT)..."

    while ! nc -z "$APP_CONFIG__DB__HOST" "${APP_CONFIG__DB__PORT:-5432}"; do
      sleep 0.5
    done

    echo "PostgreSQL has been launched!"
fi

echo "Starting migrations"
alembic upgrade head
echo "Applied migrations successfully!"

echo "Starting database seeding"
python fakedata/seed_db.py
echo "Database seeded successfully!"

exec "$@"