from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "your-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str
    ENVIRONMENT: str = "development"
    OPENAI_API_KEY: str = ""
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

    class Config:
        # Docker sets environment variables from env_file, so we don't need to specify file paths
        env_file = None


settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings
