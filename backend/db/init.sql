-- This file is for common database initialization tasks, like enabling extensions.
-- Individual databases are created via POSTGRES_DB environment variable in docker-compose.yml

-- Enable uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";