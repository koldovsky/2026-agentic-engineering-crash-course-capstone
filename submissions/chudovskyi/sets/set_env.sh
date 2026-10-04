#!/bin/sh

echo "Set ENVIRONMENTS ..."

export APP_CONFIG__ENV=$"prod"

export APP_CONFIG__DB__NAME=$"promt_db"
export APP_CONFIG__DB__USERNAME=$"nazar"

export APP_CONFIG__DB__HOST=$"pg"
export APP_CONFIG__DB__PORT=$"5432"
export APP_CONFIG__DB__DRIVERNAME=$"postgresql+asyncpg"
export APP_CONFIG__DB__ECHO=$"0"

echo "ENVIRONMENTS have been set successfully"