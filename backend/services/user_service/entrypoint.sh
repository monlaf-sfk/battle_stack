#!/bin/bash
set -e

echo "=== User Service Starting ==="

cd /app/user_service

export PYTHONPATH=$PYTHONPATH:/app

echo "=== Waiting for database ==="
python3 /app/wait_for_db.py

echo "=== Enabling uuid-ossp extension ==="
export PGPASSWORD="$POSTGRES_PASSWORD"
psql -h user-db -U user_user -d user_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" || echo "Extension already exists"

echo "=== Running Alembic migrations ==="
alembic -c alembic.ini upgrade head

echo "=== Starting User Service on port 8000 ==="
exec uvicorn user_service.main:app --host 0.0.0.0 --port 8000 