#!/bin/bash
set -e

echo "=== Auth Service Starting ==="

cd /app/auth_service

echo "=== Waiting for database ==="
python3 /app/wait_for_db.py

echo "=== Enabling uuid-ossp extension ==="
export PGPASSWORD="$POSTGRES_PASSWORD"
psql -h auth-db -U auth_user -d auth_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" || echo "Extension already exists"

echo "=== Running Alembic migrations ==="
alembic -c alembic.ini upgrade head

echo "=== Starting Auth Service on port 8000 ==="
exec uvicorn auth_service.main:app --host 0.0.0.0 --port 8000 