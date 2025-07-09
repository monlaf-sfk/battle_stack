// ... existing code ...
    echo "🔍 Checking existing tables in $service database..."
    
    case $service in
        "user")
            docker-compose exec $db_container psql -U $db_user -d $db_name -c "DROP TABLE IF EXISTS user_achievements CASCADE;" || true
            docker-compose exec $db_container psql -U $db_user -d $db_name -c "DROP TABLE IF EXISTS user_progress CASCADE;" || true
            docker-compose exec $db_container psql -U $db_user -d $db_name -c "DROP TABLE IF EXISTS user_profiles CASCADE;" || true
            ;;
        "duels")
            docker-compose exec $db_container psql -U $db_user -d $db_name -c "DROP TABLE IF EXISTS player_ratings CASCADE;" || true
// ... existing code ...
