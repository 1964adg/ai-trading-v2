"""Configuration settings for the AI Trading Backend."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Server Configuration
    PORT: int = 8000
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    # Trading Configuration
    PAPER_TRADING: bool = True
    
    # Database Configuration (optional, for future use)
    DATABASE_URL: Optional[str] = None
    
    # Redis Configuration (optional, for future use)
    REDIS_URL: Optional[str] = None
    
    # Environment
    ENVIRONMENT: str = "development"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
