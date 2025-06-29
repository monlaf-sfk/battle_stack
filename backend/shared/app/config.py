from pydantic_settings import BaseSettings
import os


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
    GOOGLE_OAUTH_REDIRECT_URI: str = "http://localhost:3000/auth/google/callback"
    
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

    class Config:
        # Load env file for local testing if specified
        env_file = os.getenv("ENV_FILE_FOR_TESTS")


settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings
