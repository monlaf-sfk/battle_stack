#!/bin/bash
set -e

cd /app/duels_service

echo "=== Running Alembic migrations ==="
alembic -c alembic.ini upgrade head

echo "=== Starting FastAPI ==="
exec uvicorn duels_service.main:app --host 0.0.0.0 --port 8004 