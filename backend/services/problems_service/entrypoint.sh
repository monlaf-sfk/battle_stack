#!/bin/bash

set -e

cd /app/problems_service

echo "=== Waiting for database ==="
python3 /app/wait_for_db.py

echo "=== Running Alembic migrations ==="
alembic -c alembic.ini upgrade head

echo "=== Starting FastAPI ==="
exec uvicorn problems_service.main:app --host 0.0.0.0 --port 8000

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h problems-db -p 5432 -U problems_user; do
  echo "PostgreSQL is not ready - sleeping for 2 seconds..."
  sleep 2
done
echo "✓ PostgreSQL is ready!"

# Ensure DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi
echo "✓ DATABASE_URL is configured"

echo "Running migrations for Problems Service..."
cd /app

# Run migrations with proper error handling
if alembic -c /app/services/problems_service/alembic.ini upgrade head; then
    echo "✓ Problems Service migrations completed successfully"
else
    echo "ERROR: Problems Service migrations failed"
    exit 1
fi

echo "Starting Problems Service on port 8000..."
exec uvicorn services.problems_service.main:app --host 0.0.0.0 --port 8000 --log-level info 