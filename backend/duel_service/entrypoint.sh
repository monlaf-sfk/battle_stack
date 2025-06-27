#!/bin/sh
set -e

echo "Running Duels Service entrypoint..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h duels-db -p 5432 -U duels_user; do
  echo "PostgreSQL is not ready - sleeping"
  sleep 2
done
echo "PostgreSQL is ready!"

# Ensure DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "Skipping migrations for now..."

# Temporarily skip migrations to test service startup
# echo "Running migrations for Duels Service..."
# cd /app/backend/duel_service
# alembic upgrade head
# 
# if [ $? -eq 0 ]; then
#     echo "Duels Service migrations completed successfully."
# else
#     echo "ERROR: Duels Service migrations failed"
#     exit 1
# fi

echo "Starting Duels Service..."
cd /app/backend
exec uvicorn duel_service.main:app --host 0.0.0.0 --port 8004 