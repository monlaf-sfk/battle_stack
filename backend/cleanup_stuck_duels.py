#!/usr/bin/env python3
"""
Утилита для очистки зависших дуэлей в базе данных
Использование: python3 cleanup_stuck_duels.py [--show|--clean-problems]
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from uuid import UUID

# Add backend path for imports
sys.path.append(os.path.join(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select, and_, func
from duel_service.models import Duel, DuelParticipant, DuelProblem, DuelStatus

# Database URL for duels service  
DATABASE_URL = "postgresql+asyncpg://duels_user:duels_password@localhost:5435/duels_db"

def looks_like_solution(code: str) -> bool:
    """Check if starter code looks like a complete solution"""
    if not code:
        return False
        
    code_lower = code.lower()
    
    # Признаки готового решения
    solution_patterns = [
        'for ', 'while ', 'if ', 'elif ', 'else:',
        'return ', 'sum(', 'max(', 'min(',
        'sqrt', 'pow', '**0.5', 'math.',
        '.append(', '.extend(', '.sort(',
        'len(', 'range(', 'enumerate(',
        '*args', 'def ', 'function '
    ]
    
    # Признаки стартового кода
    starter_patterns = [
        'pass', 'todo', '# your code here', '# implement', '# solution'
    ]
    
    solution_count = sum(1 for pattern in solution_patterns if pattern in code_lower)
    starter_count = sum(1 for pattern in starter_patterns if pattern in code_lower)
    
    # Если много признаков решения и мало признаков стартового кода
    return solution_count >= 2 and starter_count == 0 and len(code) > 100

def get_clean_starter_code(language: str, title: str = "solution") -> str:
    """Generate clean starter code"""
    import re
    clean_title = re.sub(r'[^a-zA-Z0-9\s]', '', title.lower())
    words = clean_title.split()
    
    if any(word in ['sum', 'count', 'find', 'max', 'min', 'search'] for word in words):
        func_name = '_'.join(words[:2])
    else:
        func_name = 'solution'
    
    if language == 'python':
        return f"""def {func_name}(*args):
    # TODO: Implement your solution here
    # Read the problem description carefully
    pass"""
    elif language == 'javascript':
        return f"""function {func_name}(...args) {{
    // TODO: Implement your solution here
    // Read the problem description carefully
    return null;
}}"""
    else:
        return f"// TODO: Implement {func_name} function"

async def cleanup_problem_starter_code():
    """Очистить задачи с подозрительным стартовым кодом"""
    print("🔍 Checking problems for suspicious starter code...")
    
    engine = create_async_engine(DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as session:
        try:
            # Получить все проблемы
            query = select(DuelProblem)
            result = await session.execute(query)
            problems = result.scalars().all()
            
            suspicious_count = 0
            fixed_count = 0
            
            for problem in problems:
                if not problem.starter_code:
                    continue
                    
                needs_fix = False
                new_starter_code = {}
                
                for lang, code in problem.starter_code.items():
                    if looks_like_solution(code):
                        print(f"🚨 Suspicious starter code in '{problem.title}' ({lang}):")
                        print(f"   Code: {code[:100]}...")
                        suspicious_count += 1
                        needs_fix = True
                        
                        # Создать чистый стартовый код
                        clean_code = get_clean_starter_code(lang, problem.title)
                        new_starter_code[lang] = clean_code
                        print(f"   ✅ Fixed to: {clean_code[:50]}...")
                    else:
                        new_starter_code[lang] = code
                
                if needs_fix:
                    problem.starter_code = new_starter_code
                    fixed_count += 1
            
            if fixed_count > 0:
                await session.commit()
                print(f"✅ Fixed {fixed_count} problems with suspicious starter code")
            else:
                print("✅ No problems found with suspicious starter code")
                
        except Exception as e:
            print(f"❌ Error during problem cleanup: {e}")
            await session.rollback()
            raise
        finally:
            await engine.dispose()

async def cleanup_stuck_duels():
    """Очистить зависшие дуэли"""
    print("🧹 Starting cleanup of stuck duels...")
    
    # Create async engine and session
    engine = create_async_engine(DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as session:
        try:
            # Find duels that have been in progress or waiting for too long (more than 1 hour)
            cutoff_time = datetime.utcnow() - timedelta(hours=1)
            
            query = select(Duel).where(
                and_(
                    Duel.status.in_([DuelStatus.WAITING, DuelStatus.IN_PROGRESS]),
                    Duel.created_at < cutoff_time
                )
            )
            
            result = await session.execute(query)
            stuck_duels = result.scalars().all()
            
            print(f"🔍 Found {len(stuck_duels)} potentially stuck duels")
            
            for duel in stuck_duels:
                print(f"  📋 Duel {duel.id} - Status: {duel.status}, Created: {duel.created_at}")
                
                # Mark as completed
                duel.status = DuelStatus.COMPLETED
                duel.completed_at = datetime.utcnow()
                
                if duel.started_at:
                    duel.duration_seconds = int((duel.completed_at - duel.started_at).total_seconds())
                else:
                    # If never started, set minimal duration
                    duel.duration_seconds = 0
                
                print(f"  ✅ Marked duel {duel.id} as completed")
            
            # Commit all changes
            await session.commit()
            print(f"✅ Successfully cleaned up {len(stuck_duels)} stuck duels")
            
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
            await session.rollback()
            raise
        finally:
            await engine.dispose()

async def show_active_duels():
    """Показать активные дуэли"""
    print("📊 Checking active duels...")
    
    engine = create_async_engine(DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as session:
        try:
            # Get active duels
            query = select(Duel).where(
                Duel.status.in_([DuelStatus.WAITING, DuelStatus.IN_PROGRESS])
            ).order_by(Duel.created_at.desc())
            
            result = await session.execute(query)
            active_duels = result.scalars().all()
            
            print(f"🎯 Found {len(active_duels)} active duels:")
            
            for duel in active_duels:
                print(f"  🔸 ID: {duel.id}")
                print(f"     Status: {duel.status}")
                print(f"     Mode: {duel.mode}")
                print(f"     Created: {duel.created_at}")
                print(f"     Started: {duel.started_at}")
                print()
                
        except Exception as e:
            print(f"❌ Error checking active duels: {e}")
        finally:
            await engine.dispose()

async def main():
    """Main function"""
    if len(sys.argv) > 1:
        if sys.argv[1] == "--show":
            await show_active_duels()
        elif sys.argv[1] == "--clean-problems":
            await cleanup_problem_starter_code()
        else:
            print("Invalid option. Use --show or --clean-problems")
    else:
        await show_active_duels()
        print("\n" + "="*50)
        
        response = input("🤔 Do you want to cleanup stuck duels? (y/N): ")
        if response.lower() in ['y', 'yes']:
            await cleanup_stuck_duels()
        else:
            print("📋 No cleanup performed")

if __name__ == "__main__":
    asyncio.run(main()) 