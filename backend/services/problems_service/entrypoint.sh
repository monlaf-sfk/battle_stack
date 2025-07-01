#!/bin/bash
set -e

echo "=== Problems Service Starting ==="

cd /app/problems_service

echo "=== Waiting for database ==="
python3 /app/wait_for_db.py

echo "=== Enabling uuid-ossp extension ==="
export PGPASSWORD="$POSTGRES_PASSWORD"
psql -h problems-db -U problems_user -d problems_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" || echo "Extension already exists"

echo "=== Running Alembic migrations ==="
alembic -c alembic.ini upgrade head

echo "=== Starting Problems Service on port 8000 ==="
exec uvicorn problems_service.main:app --host 0.0.0.0 --port 8000 