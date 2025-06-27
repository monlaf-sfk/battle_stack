#!/bin/bash

set -e

echo "Starting Problems Service..."

# Wait for database to be ready using Python script
echo "Waiting for database..."
python3 problems_service/wait_for_db.py

if [ $? -ne 0 ]; then
    echo "Failed to connect to database"
    exit 1
fi

# Run migrations if needed
echo "Running database migrations..."
cd problems_service
alembic upgrade head
cd ..

# Start the application
echo "Starting FastAPI application..."
exec uvicorn problems_service.main:app --host 0.0.0.0 --port 8000 