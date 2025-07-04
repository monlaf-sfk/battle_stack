#!/usr/bin/env python3
"""Wait for database to be ready."""

import os
import sys
import time
import logging
import asyncpg
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def wait_for_db(max_retries=30, retry_interval=2):
    """Wait for database to be ready."""
    database_url = os.getenv('DATABASE_URL', 'postgresql+asyncpg://user_user:user_password@user-db:5432/user_db')
    
    # Convert DATABASE_URL to asyncpg format if needed
    if '+asyncpg' in database_url:
        database_url = database_url.replace('+asyncpg', '')
    
    logger.info(f"Waiting for database at {database_url}")
    
    for attempt in range(max_retries):
        try:
            conn = await asyncpg.connect(database_url)
            await conn.execute('SELECT 1')
            await conn.close()
            logger.info("Database is ready!")
            return True
        except Exception as e:
            logger.info(f"Database not ready (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_interval)
            else:
                logger.error("Database failed to become ready in time")
                return False
    
    return False


if __name__ == "__main__":
    success = asyncio.run(wait_for_db())
    sys.exit(0 if success else 1) 