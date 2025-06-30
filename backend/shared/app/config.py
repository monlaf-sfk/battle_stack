from pydantic_settings import BaseSettings
import os
from typing import List
from pydantic import model_validator
import json


def parse_origins(origins: str | list[str] | None) -> list[str]:
    if not origins:
        # Return default values if empty
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://battlestack.me",
            "https://www.battlestack.me"
        ]
    if isinstance(origins, list):
        return origins
    if isinstance(origins, str):
        s = origins.strip()
        if not s:
            return [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "https://battlestack.me",
                "https://www.battlestack.me"
            ]
        # Try to parse as JSON array
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return [str(o) for o in parsed]
        except Exception:
            pass
        # Fallback: comma-separated string
        return [o.strip() for o in s.split(",") if o.strip()]
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://battlestack.me",
        "https://www.battlestack.me"
    ]

class Settings(BaseSettings):
    SECRET_KEY: str = "your-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str
    ENVIRONMENT: str = "development"
    OPENAI_API_KEY: str = ""
    JUDGE0_API_KEY: str = ""
    
    # 🔐 Google OAuth Configuration
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_OAUTH_REDIRECT_URI: str = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:3000/auth/google/callback")
    
    CORS_ORIGINS: str | list[str] | None = None

    @model_validator(mode="after")
    def parse_cors_origins(self):
        self.CORS_ORIGINS = parse_origins(self.CORS_ORIGINS)
        return self

    class Config:
        # Load env file for local testing if specified
        env_file = os.getenv("ENV_FILE_FOR_TESTS")


settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings
