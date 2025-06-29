#!/bin/bash
set -e

cd /app/user_service

echo "=== Running Alembic migrations ==="
alembic -c alembic.ini upgrade head

echo "=== Starting FastAPI ==="
exec uvicorn user_service.main:app --host 0.0.0.0 --port 8000 