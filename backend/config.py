"""Configuration settings for the AI Trading Backend."""

import os
from typing import Optional, Union
from pydantic import ConfigDict, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server Configuration
    PORT: int = 8000
    CORS_ORIGINS: Union[str, list[str]] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, list[str]]) -> list[str]:
        """Parse CORS_ORIGINS from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Trading Configuration
    PAPER_TRADING: bool = True

    # Database Configuration - PostgreSQL ONLY
    DATABASE_URL: str = (
        "postgresql+psycopg2://trader:Adgpassword64!@localhost:5433/ai_trading"
    )

    # Redis Configuration (optional)
    REDIS_HOST: Optional[str] = None
    REDIS_PORT: Optional[int] = None
    REDIS_URL: Optional[str] = None

    # Binance Configuration (optional)
    BINANCE_BASE_URL: str = "https://api.binance.com"
    BINANCE_API_KEY: Optional[str] = None
    BINANCE_API_SECRET: Optional[str] = None

    # Frontend Configuration
    NODE_ENV: str = "development"
    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"

    # Security
    JWT_SECRET_KEY: Optional[str] = None
    ENCRYPTION_KEY: Optional[str] = None

    # Logging
    LOG_LEVEL: str = "INFO"

    # Monitoring
    ENABLE_METRICS: bool = False
    PROMETHEUS_PORT: Optional[int] = None

    # Feature Flags
    ENABLE_MICROSERVICES: bool = False
    ENABLE_AI_PREDICTIONS: bool = False
    ENABLE_PATTERN_LEARNING: bool = True

    # Docker
    COMPOSE_PROJECT_NAME: str = "ai-trading-v2"
    DOCKER_NETWORK: str = "trading-network"

    # Environment
    ENVIRONMENT: str = "development"

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=(),
    )


def _truthy(v: str | None) -> bool:
    return (v or "").strip().lower() in {"1", "true", "yes", "y", "on"}


# ✅ Istanzia Settings UNA SOLA VOLTA
settings = Settings()
