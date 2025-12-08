"""Configuration settings for the AI Trading Backend."""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, Union


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Server Configuration
    PORT: int = 8000
    CORS_ORIGINS: Union[str, list[str]] = "http://localhost:3000"
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS_ORIGINS from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v
    
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
