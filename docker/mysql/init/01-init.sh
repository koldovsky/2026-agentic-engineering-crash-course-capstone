#!/bin/sh
set -e

# Runs once, on first start of an empty data volume. Credentials come from the environment (.env -> compose.yaml).
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
CREATE DATABASE IF NOT EXISTS \`demo\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON \`demo\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL
