#!/bin/bash

# Microservices Migration Management Script
# Usage: ./manage_migrations.sh [command] [service] [message]
# Commands: status, create, upgrade, downgrade, shell
# Services: auth, user, problems, duels, all

set -e

SERVICES=("auth" "user" "duels")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_usage() {
    echo "Usage: $0 [command] [service] [message]"
    echo ""
    echo "Commands:"
    echo "  status       - Show migration status"
    echo "  create       - Create new migration (requires message)"
    echo "  upgrade      - Apply migrations"
    echo "  downgrade    - Rollback migrations"
    echo "  shell        - Open alembic shell"
    echo ""
    echo "Services: auth, user, problems, duels, all"
    echo ""
    echo "Examples:"
    echo "  $0 status all"
    echo "  $0 create auth 'add_new_field_to_user'"
    echo "  $0 upgrade all"
    echo "  $0 downgrade user -1"
}

function get_db_url() {
    local service=$1
    case $service in
        auth)
            echo "postgresql://auth_user:auth_password@localhost:5433/auth_db"
            ;;
        user)
            echo "postgresql://user_user:user_password@localhost:5434/user_db"
            ;;
        duels)
            echo "postgresql://duels_user:duels_password@localhost:5436/duels_db"
            ;;
    esac
}

function run_alembic() {
    local service=$1
    local command=$2
    local args=$3
    
    if [[ ! " ${SERVICES[@]} " =~ " $service " ]]; then
        echo -e "${RED}Error: Unknown service '$service'${NC}"
        return 1
    fi
    
    local service_dir="services/${service}_service"
    local db_url=$(get_db_url $service)
    
    echo -e "${BLUE}=== $service Service ===${NC}"
    
    if [ ! -d "$service_dir" ]; then
        echo -e "${RED}Error: Service directory $service_dir not found${NC}"
        return 1
    fi
    
    cd "$service_dir"
    
    case $command in
        status)
            alembic -c alembic.ini -x sqlalchemy.url="$db_url" current
            alembic -c alembic.ini -x sqlalchemy.url="$db_url" heads
            ;;
        create)
            if [ -z "$args" ]; then
                echo -e "${RED}Error: Message required for create command${NC}"
                return 1
            fi
            alembic -c alembic.ini revision --autogenerate -m "$args"
            ;;
        upgrade)
            local target=${args:-"head"}
            alembic -c alembic.ini -x sqlalchemy.url="$db_url" upgrade $target
            ;;
        downgrade)
            local target=${args:--1}
            alembic -c alembic.ini -x sqlalchemy.url="$db_url" downgrade $target
            ;;
        shell)
            alembic -c alembic.ini -x sqlalchemy.url="$db_url" show current
            ;;
        *)
            echo -e "${RED}Error: Unknown command '$command'${NC}"
            return 1
            ;;
    esac
    
    cd - > /dev/null
}

# Main script logic
COMMAND=$1
SERVICE=$2
MESSAGE=$3

if [ -z "$COMMAND" ] || [ -z "$SERVICE" ]; then
    print_usage
    exit 1
fi

if [ "$COMMAND" = "create" ] && [ -z "$MESSAGE" ]; then
    echo -e "${RED}Error: Message required for create command${NC}"
    print_usage
    exit 1
fi

if [ "$SERVICE" = "all" ]; then
    echo -e "${GREEN}Running $COMMAND for all services...${NC}"
    for service in "${SERVICES[@]}"; do
        if ! run_alembic "$service" "$COMMAND" "$MESSAGE"; then
            echo -e "${RED}Failed to run $COMMAND for $service${NC}"
            exit 1
        fi
        echo ""
    done
    echo -e "${GREEN}✓ Completed $COMMAND for all services${NC}"
else
    run_alembic "$SERVICE" "$COMMAND" "$MESSAGE"
fi 