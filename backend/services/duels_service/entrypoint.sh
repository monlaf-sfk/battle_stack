#!/bin/bash
set -e

echo "=== Duels Service Starting ==="

cd /app/duels_service

export PYTHONPATH=$PYTHONPATH:/app

echo "=== Waiting for database ==="
python3 /app/wait_for_db.py

echo "=== Enabling uuid-ossp extension ==="
export PGPASSWORD="$POSTGRES_PASSWORD"
psql -h duels-db -U duels_user -d duels_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" || echo "Extension already exists"

echo "=== Running Alembic migrations ==="
alembic -c alembic.ini upgrade head

echo "=== Starting Duels Service on port 8000 ==="
exec uvicorn duels_service.main:app --host 0.0.0.0 --port 8000 