 #!/bin/bash

# 🗄️ Скрипт управления миграциями для микросервисной архитектуры
# Использование: ./manage_migrations.sh [команда] [сервис] [дополнительные_параметры]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Доступные сервисы
SERVICES=("auth" "user" "problems" "duels")

# Функция для вывода справки
show_help() {
    echo -e "${BLUE}🗄️ Управление миграциями микросервисов${NC}"
    echo ""
    echo -e "${YELLOW}Использование:${NC}"
    echo "  ./manage_migrations.sh [команда] [сервис] [параметры]"
    echo ""
    echo -e "${YELLOW}Команды:${NC}"
    echo "  status          - показать текущее состояние миграций"
    echo "  create          - создать новую миграцию"
    echo "  upgrade         - применить миграции"
    echo "  downgrade       - откатить миграцию"
    echo "  history         - показать историю миграций"
    echo "  reset           - сбросить миграции (ОСТОРОЖНО!)"
    echo "  shell           - войти в shell сервиса"
    echo ""
    echo -e "${YELLOW}Сервисы:${NC}"
    echo "  auth            - Auth Service (пользователи, аутентификация)"
    echo "  user            - User Service (профили пользователей)"
    echo "  problems        - Problems Service (задачи и решения)"
    echo "  duels           - Duels Service (дуэли и рейтинги)"
    echo "  all             - все сервисы"
    echo ""
    echo -e "${YELLOW}Примеры:${NC}"
    echo "  ./manage_migrations.sh status all"
    echo "  ./manage_migrations.sh create auth \"add new auth feature\""
    echo "  ./manage_migrations.sh upgrade user"
    echo "  ./manage_migrations.sh shell problems"
}

# Функция для проверки, что Docker Compose запущен
check_docker() {
    if ! docker-compose ps | grep -q "Up"; then
        echo -e "${RED}❌ Сервисы не запущены. Запустите: docker-compose up -d${NC}"
        exit 1
    fi
}

# Функция для получения имени контейнера сервиса
get_container_name() {
    local service=$1
    echo "${service}-service"
}

# Функция для получения директории сервиса
get_service_dir() {
    local service=$1
    echo "/app/${service}_service"
}

# Функция для выполнения команды в сервисе
exec_in_service() {
    local service=$1
    local command=$2
    local container=$(get_container_name $service)
    local service_dir=$(get_service_dir $service)
    
    echo -e "${BLUE}🔧 Выполняю в $service: $command${NC}"
    docker-compose exec $container bash -c "cd $service_dir && $command"
}

# Функция для показа статуса миграций
show_status() {
    local service=$1
    
    if [ "$service" = "all" ]; then
        for svc in "${SERVICES[@]}"; do
            echo -e "${GREEN}=== $svc Service ===${NC}"
            exec_in_service $svc "alembic current -v"
            echo ""
        done
    else
        exec_in_service $service "alembic current -v"
    fi
}

# Функция для создания миграции
create_migration() {
    local service=$1
    local message=$2
    
    if [ -z "$message" ]; then
        echo -e "${RED}❌ Не указано описание миграции${NC}"
        echo "Использование: ./manage_migrations.sh create $service \"описание миграции\""
        exit 1
    fi
    
    exec_in_service $service "alembic revision --autogenerate -m \"$message\""
}

# Функция для применения миграций
upgrade_migrations() {
    local service=$1
    
    if [ "$service" = "all" ]; then
        for svc in "${SERVICES[@]}"; do
            echo -e "${GREEN}=== Обновляю $svc Service ===${NC}"
            exec_in_service $svc "alembic upgrade head"
            echo ""
        done
    else
        exec_in_service $service "alembic upgrade head"
    fi
}

# Функция для отката миграций
downgrade_migrations() {
    local service=$1
    local steps=${2:-"-1"}
    
    echo -e "${YELLOW}⚠️  ВНИМАНИЕ: Откат миграций может привести к потере данных!${NC}"
    read -p "Продолжить? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Отменено"
        exit 1
    fi
    
    exec_in_service $service "alembic downgrade $steps"
}

# Функция для показа истории миграций
show_history() {
    local service=$1
    
    if [ "$service" = "all" ]; then
        for svc in "${SERVICES[@]}"; do
            echo -e "${GREEN}=== $svc Service ===${NC}"
            exec_in_service $svc "alembic history"
            echo ""
        done
    else
        exec_in_service $service "alembic history"
    fi
}

# Функция для сброса миграций
reset_migrations() {
    local service=$1
    
    echo -e "${RED}🚨 ОПАСНО: Сброс миграций удалит все данные!${NC}"
    echo -e "${YELLOW}Это действие нельзя отменить!${NC}"
    read -p "Вы уверены? Введите 'RESET' для подтверждения: " confirmation
    
    if [ "$confirmation" != "RESET" ]; then
        echo "Отменено"
        exit 1
    fi
    
    exec_in_service $service "alembic stamp base"
    exec_in_service $service "alembic upgrade head"
}

# Функция для входа в shell сервиса
enter_shell() {
    local service=$1
    local container=$(get_container_name $service)
    local service_dir=$(get_service_dir $service)
    
    echo -e "${BLUE}🖥️  Вход в shell $service Service...${NC}"
    echo -e "${YELLOW}Рабочая директория: $service_dir${NC}"
    docker-compose exec $container bash -c "cd $service_dir && bash"
}

# Проверка валидности сервиса
validate_service() {
    local service=$1
    
    if [ "$service" = "all" ]; then
        return 0
    fi
    
    for svc in "${SERVICES[@]}"; do
        if [ "$svc" = "$service" ]; then
            return 0
        fi
    done
    
    echo -e "${RED}❌ Неизвестный сервис: $service${NC}"
    echo -e "${YELLOW}Доступные сервисы: ${SERVICES[*]} all${NC}"
    exit 1
}

# Основная логика
main() {
    local command=$1
    local service=$2
    local param=$3
    
    if [ -z "$command" ] || [ "$command" = "help" ]; then
        show_help
        exit 0
    fi
    
    if [ -z "$service" ]; then
        echo -e "${RED}❌ Не указан сервис${NC}"
        show_help
        exit 1
    fi
    
    validate_service $service
    check_docker
    
    case $command in
        "status")
            show_status $service
            ;;
        "create")
            if [ "$service" = "all" ]; then
                echo -e "${RED}❌ Создание миграций для всех сервисов одновременно не поддерживается${NC}"
                exit 1
            fi
            create_migration $service "$param"
            ;;
        "upgrade")
            upgrade_migrations $service
            ;;
        "downgrade")
            if [ "$service" = "all" ]; then
                echo -e "${RED}❌ Откат миграций для всех сервисов одновременно не поддерживается${NC}"
                exit 1
            fi
            downgrade_migrations $service "$param"
            ;;
        "history")
            show_history $service
            ;;
        "reset")
            if [ "$service" = "all" ]; then
                echo -e "${RED}❌ Сброс миграций для всех сервисов одновременно не поддерживается${NC}"
                exit 1
            fi
            reset_migrations $service
            ;;
        "shell")
            if [ "$service" = "all" ]; then
                echo -e "${RED}❌ Вход в shell для всех сервисов одновременно не поддерживается${NC}"
                exit 1
            fi
            enter_shell $service
            ;;
        *)
            echo -e "${RED}❌ Неизвестная команда: $command${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Запуск основной функции
main "$@"