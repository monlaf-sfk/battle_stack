#!/bin/bash

# Reset Migration State Script
# This script will clean the database state so migrations can run cleanly

set -e

echo "🔧 Resetting migration state in databases..."

# Function to reset a specific database
reset_database() {
    local service=$1
    local db_name="${service}_db"
    local db_user="${service}_user"
    local db_container="${service}-db"
    
    echo "📝 Resetting $service database..."
    
    # Check if database container is running
    if ! docker-compose exec $db_container echo "Database is accessible" >/dev/null 2>&1; then
        echo "❌ Database container $db_container is not running"
        return 1
    fi
    
    # Drop alembic version table
    echo "🗑️  Dropping Alembic version table for $service..."
    docker-compose exec $db_container psql -U $db_user -d $db_name -c "DROP TABLE IF EXISTS alembic_version_${service};" || true
    
    # Drop tables based on service
    echo "🔍 Dropping existing tables in $service database..."
    
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
    esac
    
    echo "✅ $service database reset completed"
}

# Reset each database
echo "🔧 Starting database resets..."

# User service
reset_database "user"

# Duels service
reset_database "duels"

echo "🎉 All databases have been reset!"
echo ""
echo "Now you can restart the services and migrations will run cleanly:"
echo "   docker-compose up --build" 