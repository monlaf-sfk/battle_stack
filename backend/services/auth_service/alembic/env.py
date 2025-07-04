from __future__ import with_statement

import os
import sys
from logging.config import fileConfig
import pathlib

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Ensure project root is in PYTHONPATH
PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line prevents the need to turn off the logger manually.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import models for AUTH SERVICE ONLY
from shared.app.auth.models import User, AdminAuditLog, Base

target_metadata = Base.metadata

def get_url() -> str:
    """Get database URL from command line or environment variable."""
    # First try to get URL from command line (passed via -x sqlalchemy.url=...)
    cmd_line_url: str | None = context.get_x_argument(as_dictionary=True).get('sqlalchemy.url')
    if cmd_line_url:
        # Convert async URL to sync for Alembic if it was passed via cmd line and has +asyncpg
        if '+asyncpg' in cmd_line_url:
            cmd_line_url = cmd_line_url.replace('+asyncpg', '')
        return cmd_line_url
    
    # Fallback to environment variable with a robust default
    env_url: str = os.getenv('DATABASE_URL', 'postgresql://auth_user:auth_password@auth-db:5432/auth_db')
    
    # Convert async URL to sync for Alembic if it came from env var
    if '+asyncpg' in env_url:
        env_url = env_url.replace('+asyncpg', '')
    return env_url

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table="alembic_version_auth",  # Separate version table for auth service
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Override the sqlalchemy.url in the configuration
    config_section = config.get_section(config.config_ini_section, {})
    config_section['sqlalchemy.url'] = get_url()
    
    connectable = engine_from_config(
        config_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    
    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            version_table="alembic_version_auth"  # Separate version table for auth service
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
