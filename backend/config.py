"""Configuration settings for the AI Trading Backend."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    PORT: int = 8000
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    PAPER_TRADING: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
