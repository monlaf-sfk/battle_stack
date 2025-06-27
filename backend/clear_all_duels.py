#!/usr/bin/env python3
"""
Скрипт для полной очистки системы дуэлей от застрявших данных
Использование: python3 clear_all_duels.py
"""

import asyncio
import sys
import os

# Add backend path for imports
sys.path.append(os.path.join(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select, delete
from duel_service.models import (
    Duel, DuelParticipant, DuelProblem, DuelCodeSnapshot, 
    PlayerRating, PlayerAchievement, DuelMatchHistory
)

# Database URL for duels service  
DATABASE_URL = "postgresql+asyncpg://duels_user:duels_password@localhost:5435/duels_db"

async def clear_all_duel_data():
    """Очистить все данные дуэлей (ОСТОРОЖНО!)"""
    print("⚠️ WARNING: This will delete ALL duel data!")
    print("This includes:")
    print("- All duels and participants")
    print("- All problems")
    print("- All code snapshots")
    print("- All player ratings and match history")
    print("- All achievements")
    print()
    
    response = input("Are you sure you want to continue? Type 'YES' to confirm: ")
    if response != 'YES':
        print("❌ Operation cancelled")
        return
    
    engine = create_async_engine(DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as session:
        try:
            print("🧹 Starting complete cleanup...")
            
            # Order matters due to foreign key constraints
            tables_to_clear = [
                ("Code Snapshots", DuelCodeSnapshot),
                ("Player Achievements", PlayerAchievement), 
                ("Match History", DuelMatchHistory),
                ("Duel Participants", DuelParticipant),
                ("Duels", Duel),
                ("Problems", DuelProblem),
                ("Player Ratings", PlayerRating),
            ]
            
            total_deleted = 0
            
            for table_name, model in tables_to_clear:
                delete_stmt = delete(model)
                result = await session.execute(delete_stmt)
                deleted_count = result.rowcount
                total_deleted += deleted_count
                print(f"  🗑️ Deleted {deleted_count} {table_name}")
            
            await session.commit()
            print(f"✅ Complete cleanup finished: {total_deleted} records deleted")
            
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
            await session.rollback()
            raise
        finally:
            await engine.dispose()

async def main():
    await clear_all_duel_data()

if __name__ == "__main__":
    asyncio.run(main()) 