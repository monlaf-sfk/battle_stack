#!/bin/bash

# Fix Migration Issues Script
# This script will reset Alembic state and apply migrations correctly

set -e

echo "🔧 Fixing migration issues..."

# Function to fix a specific service
fix_service_migrations() {
    local service=$1
    local db_name="${service}_db"
    local db_user="${service}_user"
    local db_container="${service}-db"
    local service_dir="services/${service}_service"
    
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
            docker-compose exec $db_container psql -U $db_user -d $db_name -c "DROP TABLE IF EXISTS user_achievements CASCADE;" || true
            docker-compose exec $db_container psql -U $db_user -d $db_name -c "DROP TABLE IF EXISTS user_progress CASCADE;" || true
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
    
    # Navigate to service directory and run migrations
    echo "🚀 Running migrations for $service..."
    cd $service_dir
    
    # Set the correct database URL
    case $service in
        "auth")
            export DATABASE_URL="postgresql://auth_user:auth_password@auth-db:5432/auth_db"
            ;;
        "user")
            export DATABASE_URL="postgresql://user_user:user_password@user-db:5432/user_db"
            ;;
        "duels")
            export DATABASE_URL="postgresql://duels_user:duels_password@duels-db:5432/duels_db"
            ;;
    esac
    
    # Run the migration
    alembic -c alembic.ini upgrade head
    
    # Go back to backend directory
    cd ../..
    
    echo "✅ $service service migrations completed"
}

# Fix each service (skip auth as it seems to be working)
echo "🔧 Starting migration fixes..."

# User service
fix_service_migrations "user"

# Duels service
fix_service_migrations "duels"

echo "🎉 All migration issues have been fixed!"
echo ""
echo "You can now run: docker-compose up --build" 