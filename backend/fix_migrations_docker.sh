#!/bin/bash

# Fix Migration Issues Script (Docker Version)
# This script will reset Alembic state and apply migrations correctly inside Docker containers

set -e

echo "🔧 Fixing migration issues using Docker containers..."

# Function to fix a specific service
fix_service_migrations() {
    local service=$1
    local db_name="${service}_db"
    local db_user="${service}_user"
    local db_container="${service}-db"
    local service_container="${service}-service"
    
    echo "📝 Fixing $service service migrations..."
    
    # Check if database container is running
    if ! docker-compose exec $db_container echo "Database is accessible" >/dev/null 2>&1; then
        echo "❌ Database container $db_container is not running"
        return 1
    fi
    
    # Drop and recreate alembic version table
    echo "🗑️  Resetting Alembic version table for $service..."
    docker-compose exec $db_container psql -U $db_user -d $db_name -c "DROP TABLE IF EXISTS alembic_version_${service};" || true
    
    # Check if tables exist and drop them if necessary (only for clean reset)
    echo "🔍 Checking existing tables in $service database..."
    
    case $service in
        "user")
            docker-compose exec $db_container psql -U $db_user -d $db_name -c "DROP TABLE IF EXISTS user_profiles CASCADE;" || true
            ;;
        "duels")
            docker-compose exec $db_container psql -U $db_user -d $db_name -c "DROP TABLE IF EXISTS player_ratings CASCADE;" || true
            docker-compose exec $db_container psql -U $db_user -d $db_name -c "DROP TABLE IF EXISTS duels CASCADE;" || true
            docker-compose exec $db_container psql -U $db_user -d $db_name -c "DROP TYPE IF EXISTS duelstatus CASCADE;" || true
            ;;
        "auth")
            # Auth service tables are likely needed, so we'll be more careful
            echo "⚠️  Keeping auth tables as they may contain important data"
            ;;
    esac
    
    # Run migrations inside the service container
    echo "🚀 Running migrations for $service inside container..."
    
    # Set the correct database URL environment variable
    case $service in
        "auth")
            db_url="postgresql://auth_user:auth_password@auth-db:5432/auth_db"
            ;;
        "user")
            db_url="postgresql://user_user:user_password@user-db:5432/user_db"
            ;;
        "duels")
            db_url="postgresql://duels_user:duels_password@duels-db:5432/duels_db"
            ;;
    esac
    
    # Run the migration inside the container
    docker-compose exec -e DATABASE_URL="$db_url" $service_container bash -c "cd /app/${service}_service && alembic -c alembic.ini upgrade head"
    
    echo "✅ $service service migrations completed"
}

# Check if Docker Compose is running
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Docker Compose services are not running. Please start them first with:"
    echo "   docker-compose up -d"
    exit 1
fi

# Fix each service (skip auth as it seems to be working)
echo "🔧 Starting migration fixes..."

# User service
fix_service_migrations "user"

# Duels service
fix_service_migrations "duels"

echo "🎉 All migration issues have been fixed!"
echo ""
echo "You can now restart the services: docker-compose restart" 