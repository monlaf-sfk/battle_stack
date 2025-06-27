#!/bin/sh
set -e

echo "Running Auth Service entrypoint..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h auth-db -p 5432 -U auth_user; do
  echo "PostgreSQL is not ready - sleeping"
  sleep 2
done
echo "PostgreSQL is ready!"

# Ensure DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "Running migrations for Auth Service..."

# Run migrations using the environment variable directly
# The env.py file will handle the URL conversion
alembic -c /app/auth_service/alembic.ini upgrade head

if [ $? -eq 0 ]; then
    echo "Auth Service migrations completed successfully."
else
    echo "ERROR: Auth Service migrations failed"
    exit 1
fi

echo "Starting Auth Service..."
exec uvicorn auth_service.main:app --host 0.0.0.0 --port 8000 