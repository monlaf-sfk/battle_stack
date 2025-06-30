#!/bin/bash
set -e

cd /app/auth_service

echo "=== Waiting for database ==="
python3 /app/wait_for_db.py

echo "=== Running Alembic migrations ==="
alembic -c alembic.ini upgrade head

echo "=== Starting FastAPI ==="
exec uvicorn auth_service.main:app --host 0.0.0.0 --port 8000 