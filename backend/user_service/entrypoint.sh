#!/bin/sh
set -e

echo "Running User Service entrypoint..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h user-db -p 5432 -U user_user; do
  echo "PostgreSQL is not ready - sleeping"
  sleep 2
done
echo "PostgreSQL is ready!"

# Ensure DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "Running migrations for User Service..."

# Run migrations using the environment variable directly
# The env.py file will handle the URL conversion
alembic -c /app/user_service/alembic.ini upgrade head

if [ $? -eq 0 ]; then
    echo "User Service migrations completed successfully."
else
    echo "ERROR: User Service migrations failed"
    exit 1
fi

echo "Starting User Service..."
exec uvicorn user_service.main:app --host 0.0.0.0 --port 8000 