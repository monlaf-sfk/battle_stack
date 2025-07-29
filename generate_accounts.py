#!/usr/bin/env python3
"""
Скрипт для генерации тестовых аккаунтов с рейтингом и статистикой
"""

import asyncio
import asyncpg
import uuid
import random
import json
from datetime import datetime, timedelta
from typing import List, Dict
import bcrypt
import os

# Конфигурация базы данных
DB_CONFIG = {
    'auth_db': {
        'host': 'localhost',
        'port': 5433,
        'database': 'auth_db',
        'user': 'auth_user',
        'password': 'auth_password'
    },
    'user_db': {
        'host': 'localhost', 
        'port': 5434,
        'database': 'user_db',
        'user': 'user_user',
        'password': 'user_password'
    },
    'duels_db': {
        'host': 'localhost',
        'port': 5435,
        'database': 'duels_db',
        'user': 'duels_user',
        'password': 'duels_password'
    }
}

# Списки для генерации случайных данных
FIRST_NAMES = [
    "Александр", "Дмитрий", "Максим", "Сергей", "Андрей", "Алексей", "Артём", "Илья", "Кирилл", "Михаил",
    "Анна", "Мария", "Елена", "Ольга", "Татьяна", "Наталья", "Ирина", "Екатерина", "Светлана", "Юлия",
    "Владимир", "Николай", "Игорь", "Павел", "Роман", "Денис", "Евгений", "Виктор", "Олег", "Антон",
    "Дарья", "Алина", "Виктория", "Полина", "Валерия", "Кристина", "Анастасия", "Вероника", "София", "Диана"
]

LAST_NAMES = [
    "Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов", "Попов", "Васильев", "Соколов", "Михайлов", "Новиков",
    "Федоров", "Морозов", "Волков", "Алексеев", "Лебедев", "Семенов", "Егоров", "Павлов", "Козлов", "Степанов",
    "Николаев", "Орлов", "Андреев", "Макаров", "Никитин", "Захаров", "Зайцев", "Соловьев", "Борисов", "Яковлев"
]

NICKNAMES_PREFIXES = [
    "CodeMaster", "DevNinja", "AlgoWizard", "ByteHunter", "ScriptKing", "DataGuru", "CyberPro", "TechSavvy",
    "PixelWarrior", "LogicBeast", "BugSlayer", "SyntaxHero", "QuantumCoder", "DigitalSage", "CryptoNerd",
    "SystemHacker", "CloudRider", "NetRunner", "CodeBreaker", "DataMiner", "AlgoSolver", "ByteMaster",
    "ScriptNinja", "DevGuru", "TechWizard", "CyberKnight", "PixelMage", "LogicMaster", "BugHunter", "SyntaxGod"
]

NICKNAMES_SUFFIXES = [
    "2024", "Pro", "Elite", "X", "Prime", "Ultra", "Max", "Plus", "Neo", "Ace", "Boss", "King", "Lord",
    "Master", "Guru", "Ninja", "Hero", "Legend", "Champion", "Winner", "Star", "Force", "Power", "Storm"
]

PROGRAMMING_LANGUAGES = ["Python", "JavaScript", "Java", "C++", "Go", "Rust", "TypeScript", "C#", "PHP", "Ruby"]

CATEGORIES = ["Data Structures", "Algorithms", "DevOps", "Data Science"]

def hash_password(password: str) -> str:
    """Хеширование пароля"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def generate_username() -> str:
    """Генерация уникального никнейма"""
    prefix = random.choice(NICKNAMES_PREFIXES)
    suffix = random.choice(NICKNAMES_SUFFIXES)
    number = random.randint(1, 999)
    return f"{prefix}{suffix}{number}"

def generate_email(username: str) -> str:
    """Генерация email на основе никнейма"""
    domains = ["gmail.com", "yandex.ru", "mail.ru", "outlook.com", "yahoo.com"]
    return f"{username.lower()}@{random.choice(domains)}"

def generate_full_name() -> str:
    """Генерация полного имени"""
    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    return f"{first_name} {last_name}"

def generate_user_stats() -> Dict:
    """Генерация статистики пользователя"""
    # Базовые параметры
    level = random.randint(1, 50)
    xp = level * random.randint(100, 500)
    tasks_completed = random.randint(0, 200)
    total_attempts = max(tasks_completed, random.randint(tasks_completed, tasks_completed + 50))
    
    # Дуэли
    total_duels = random.randint(0, 100)
    successful_duels = random.randint(0, total_duels)
    ai_duels = random.randint(0, total_duels)
    pvp_duels = total_duels - ai_duels
    
    # Стрики
    current_streak = random.randint(0, 30)
    best_streak = max(current_streak, random.randint(current_streak, 50))
    
    # Турниры
    tournaments_played = random.randint(0, 20)
    tournaments_won = random.randint(0, tournaments_played)
    
    # Времена решения
    average_solve_time = round(random.uniform(5.0, 120.0), 2) if tasks_completed > 0 else None
    fastest_solve_time = round(random.uniform(1.0, 30.0), 2) if tasks_completed > 0 else None
    
    # Процент успеха
    success_rate = round(tasks_completed / total_attempts, 3) if total_attempts > 0 else None
    
    return {
        'xp': xp,
        'level': level,
        'tasks_completed': tasks_completed,
        'current_streak': current_streak,
        'successful_duels': successful_duels,
        'total_duels': total_duels,
        'tournaments_won': tournaments_won,
        'average_solve_time': average_solve_time,
        'fastest_solve_time': fastest_solve_time,
        'total_attempts': total_attempts,
        'success_rate': success_rate,
        'ai_duels': ai_duels,
        'pvp_duels': pvp_duels,
        'best_streak': best_streak,
        'tournaments_played': tournaments_played
    }

def generate_player_rating(user_stats: Dict) -> Dict:
    """Генерация рейтинга игрока на основе общей статистики"""
    # Базовый ELO рейтинг зависит от уровня пользователя
    level = user_stats.get('level', 1)
    base_elo = 1200 + (level - 1) * 20  # Каждый уровень добавляет ~20 ELO
    
    # Добавляем случайность ±200
    elo_rating = max(800, min(2400, base_elo + random.randint(-200, 200)))
    
    # Количество матчей коррелирует с общим количеством дуэлей
    total_duels = user_stats.get('total_duels', 0)
    # Добавляем дополнительные матчи для рейтинговых игр
    additional_matches = random.randint(0, max(50, total_duels))
    total_matches = total_duels + additional_matches
    
    # Распределение результатов на основе успешности в дуэлях
    if total_matches > 0:
        successful_duels = user_stats.get('successful_duels', 0)
        success_rate = successful_duels / max(1, user_stats.get('total_duels', 1))
        
        # Корректируем процент побед для рейтинговых игр
        win_rate = min(0.8, max(0.2, success_rate + random.uniform(-0.1, 0.1)))
        
        wins = int(total_matches * win_rate)
        remaining = total_matches - wins
        
        # 10-20% ничьих от оставшихся игр
        draw_rate = random.uniform(0.1, 0.2)
        draws = int(remaining * draw_rate)
        losses = remaining - draws
    else:
        wins = losses = draws = 0
    
    # Текущий стрик зависит от недавней активности
    current_streak_base = user_stats.get('current_streak', 0)
    # Рейтинговый стрик может отличаться от общего стрика решения задач
    current_streak = random.randint(
        max(-20, current_streak_base - 10), 
        min(20, current_streak_base + 10)
    )
    
    return {
        'elo_rating': elo_rating,
        'wins': wins,
        'losses': losses,
        'draws': draws,
        'total_matches': total_matches,
        'current_streak': current_streak
    }

def generate_category_progress() -> Dict:
    """Генерация прогресса по категориям"""
    return {category: random.randint(0, 100) for category in CATEGORIES}

def generate_achievements() -> List[Dict]:
    """Генерация достижений"""
    all_achievements = [
        {"name": "First Steps", "details": "Complete your first coding challenge", "icon": "play"},
        {"name": "Problem Solver", "details": "Solve 10 coding problems", "icon": "puzzle"},
        {"name": "Duel Master", "details": "Win your first coding duel", "icon": "sword"},
        {"name": "Speed Coder", "details": "Solve a problem in under 5 minutes", "icon": "zap"},
        {"name": "Night Owl", "details": "Solve 5 problems after midnight", "icon": "moon"},
        {"name": "Streak Master", "details": "Maintain a 7-day solving streak", "icon": "flame"},
        {"name": "Algorithm Expert", "details": "Master 20 algorithm problems", "icon": "brain"},
        {"name": "Data Structure Guru", "details": "Complete all data structure challenges", "icon": "database"},
        {"name": "Tournament Champion", "details": "Win 5 tournaments", "icon": "trophy"},
        {"name": "Code Warrior", "details": "Win 50 duels", "icon": "shield"}
    ]
    
    achievements = []
    num_achievements = random.randint(1, len(all_achievements))
    selected = random.sample(all_achievements, num_achievements)
    
    for ach in selected:
        status = random.choice(["Completed", "In Progress", "Not Started"])
        earned_at = None
        if status == "Completed":
            earned_at = (datetime.utcnow() - timedelta(days=random.randint(1, 365))).isoformat()
        
        achievements.append({
            "name": ach["name"],
            "status": status,
            "details": ach["details"],
            "icon": ach["icon"],
            "earned_at": earned_at
        })
    
    return achievements

def generate_ai_recommendations() -> List[Dict]:
    """Генерация AI рекомендаций"""
    recommendations = [
        {
            "title": "Master Binary Search",
            "description": "Improve your search algorithm skills with binary search problems.",
            "difficulty": "Medium",
            "estimated_time": "45 min",
            "improvement": "+20% expected"
        },
        {
            "title": "Dynamic Programming Basics",
            "description": "Learn the fundamentals of dynamic programming.",
            "difficulty": "Hard",
            "estimated_time": "60 min", 
            "improvement": "+25% expected"
        },
        {
            "title": "Graph Algorithms",
            "description": "Explore BFS, DFS and shortest path algorithms.",
            "difficulty": "Medium",
            "estimated_time": "50 min",
            "improvement": "+18% expected"
        }
    ]
    
    return random.sample(recommendations, random.randint(1, len(recommendations)))

def generate_news_feed() -> List[Dict]:
    """Генерация новостной ленты"""
    news = [
        {
            "title": "New Algorithm Challenge Released!",
            "description": "Test your skills with our latest sorting algorithm challenge.",
            "type": "update",
            "icon": "zap"
        },
        {
            "title": "Weekly Tournament Starting Soon",
            "description": "Join this week's coding tournament and compete for prizes.",
            "type": "tournament", 
            "icon": "trophy"
        },
        {
            "title": "System Maintenance Scheduled",
            "description": "Brief maintenance window planned for this weekend.",
            "type": "maintenance",
            "icon": "settings"
        }
    ]
    
    return random.sample(news, random.randint(1, len(news)))

def generate_roadmap_events() -> List[Dict]:
    """Генерация событий дорожной карты"""
    events = [
        {"title": "Beginner", "description": "Starting the journey", "icon": "play"},
        {"title": "Intermediate", "description": "Building core skills", "icon": "zap"},
        {"title": "Advanced", "description": "Mastering complex topics", "icon": "brain"},
        {"title": "Expert", "description": "Becoming a coding expert", "icon": "trophy"}
    ]
    
    return events

def generate_recent_duels() -> List[Dict]:
    """Генерация недавних дуэлей"""
    duels = []
    num_duels = random.randint(0, 10)
    
    for i in range(num_duels):
        duel_date = datetime.utcnow() - timedelta(days=random.randint(1, 30))
        duels.append({
            "id": str(uuid.uuid4()),
            "opponent": random.choice(NICKNAMES_PREFIXES) + str(random.randint(1, 999)),
            "result": random.choice(["win", "loss"]),
            "problem": f"Problem {random.randint(1, 1000)}",
            "language": random.choice(PROGRAMMING_LANGUAGES),
            "duration": random.randint(300, 3600),  # секунды
            "date": duel_date.isoformat()
        })
    
    return sorted(duels, key=lambda x: x["date"], reverse=True)

async def create_user_in_auth_db(conn, user_data: Dict) -> str:
    """Создание пользователя в auth_db"""
    user_id = str(uuid.uuid4())
    
    query = """
    INSERT INTO users (id, username, email, full_name, hashed_password, role, is_active, is_verified, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    """
    
    await conn.execute(
        query,
        user_id,
        user_data['username'],
        user_data['email'],
        user_data['full_name'],
        user_data['hashed_password'],
        'user',
        True,
        True,
        datetime.utcnow(),
        datetime.utcnow()
    )
    
    return user_id

async def create_user_profile_in_user_db(conn, user_id: str, stats: Dict):
    """Создание профиля пользователя в user_db"""
    profile_id = str(uuid.uuid4())
    
    query = """
    INSERT INTO user_profiles (
        id, user_id, xp, level, tasks_completed, current_streak, successful_duels, total_duels,
        tournaments_won, category_progress, achievements, ai_recommendations, news_feed,
        roadmap_events, recent_duels, last_active, created_at, updated_at, average_solve_time,
        fastest_solve_time, total_attempts, success_rate, ai_duels, pvp_duels, best_streak,
        tournaments_played, email_notifications
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
    )
    """
    
    await conn.execute(
        query,
        profile_id,
        user_id,
        stats['xp'],
        stats['level'],
        stats['tasks_completed'],
        stats['current_streak'],
        stats['successful_duels'],
        stats['total_duels'],
        stats['tournaments_won'],
        json.dumps(stats['category_progress']),
        json.dumps(stats['achievements']),
        json.dumps(stats['ai_recommendations']),
        json.dumps(stats['news_feed']),
        json.dumps(stats['roadmap_events']),
        json.dumps(stats['recent_duels']),
        datetime.utcnow(),
        datetime.utcnow(),
        datetime.utcnow(),
        stats['average_solve_time'],
        stats['fastest_solve_time'],
        stats['total_attempts'],
        stats['success_rate'],
        stats['ai_duels'],
        stats['pvp_duels'],
        stats['best_streak'],
        stats['tournaments_played'],
        True  # email_notifications default to True
    )

async def create_player_rating_in_duels_db(conn, user_id: str, username: str, rating_data: Dict):
    """Создание рейтинга игрока в duels_db"""
    query = """
    INSERT INTO player_ratings (
        user_id, username, elo_rating, wins, losses, draws, total_matches, current_streak, created_at, updated_at
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
    )
    """
    
    await conn.execute(
        query,
        user_id,
        username,
        rating_data['elo_rating'],
        rating_data['wins'],
        rating_data['losses'],
        rating_data['draws'],
        rating_data['total_matches'],
        rating_data['current_streak'],
        datetime.utcnow(),
        datetime.utcnow()
    )

async def generate_accounts(num_accounts: int = 50):
    """Основная функция генерации аккаунтов"""
    print(f"Генерация {num_accounts} тестовых аккаунтов...")
    
    try:
        # Подключение к базам данных
        print("Подключение к auth_db...")
        auth_conn = await asyncpg.connect(**DB_CONFIG['auth_db'])
        print("Подключение к user_db...")
        user_conn = await asyncpg.connect(**DB_CONFIG['user_db'])
        print("Подключение к duels_db...")
        duels_conn = await asyncpg.connect(**DB_CONFIG['duels_db'])
        print("Все подключения установлены успешно!")
    except Exception as e:
        print(f"Ошибка подключения к базе данных: {e}")
        return
    
    try:
        generated_usernames = set()
        generated_emails = set()
        
        for i in range(num_accounts):
            # Генерация уникальных данных
            username = generate_username()
            while username in generated_usernames:
                username = generate_username()
            generated_usernames.add(username)
            
            email = generate_email(username)
            while email in generated_emails:
                email = generate_email(username)
            generated_emails.add(email)
            
            # Данные пользователя
            user_data = {
                'username': username,
                'email': email,
                'full_name': generate_full_name(),
                'hashed_password': hash_password('password123')  # Простой пароль для тестов
            }
            
            # Создание пользователя в auth_db
            user_id = await create_user_in_auth_db(auth_conn, user_data)
            
            # Генерация статистики
            stats = generate_user_stats()
            stats.update({
                'category_progress': generate_category_progress(),
                'achievements': generate_achievements(),
                'ai_recommendations': generate_ai_recommendations(),
                'news_feed': generate_news_feed(),
                'roadmap_events': generate_roadmap_events(),
                'recent_duels': generate_recent_duels()
            })
            
            # Создание профиля в user_db
            await create_user_profile_in_user_db(user_conn, user_id, stats)
            
            # Генерация и создание рейтинга игрока в duels_db
            rating_data = generate_player_rating(stats)
            await create_player_rating_in_duels_db(duels_conn, user_id, username, rating_data)
            
            print(f"Создан аккаунт {i+1}/{num_accounts}: {username} ({email}) - ELO: {rating_data['elo_rating']}")
    
    except Exception as e:
        print(f"Ошибка при генерации аккаунтов: {e}")
        raise
    
    finally:
        await auth_conn.close()
        await user_conn.close()
        await duels_conn.close()
    
    print(f"Успешно создано {num_accounts} аккаунтов!")

async def main():
    """Главная функция"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Генератор тестовых аккаунтов')
    parser.add_argument('--count', '-c', type=int, default=50, help='Количество аккаунтов для генерации')
    
    args = parser.parse_args()
    
    await generate_accounts(args.count)

if __name__ == "__main__":
    asyncio.run(main())