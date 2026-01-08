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

    # Database Configuration - Multi-Database SQLite Setup
    # Trading database - Active trades, positions, orders
    TRADING_DATABASE_URL: str = "sqlite:///./data/trading.db"
    # Market data database - Historical candlestick data
    MARKET_DATABASE_URL: str = "sqlite:///./data/market_data.db"
    # Analytics database - Pattern detection, ML results
    ANALYTICS_DATABASE_URL: str = "sqlite:///./data/analytics.db"

    # Legacy PostgreSQL support (optional, for migration)
    POSTGRES_DB: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    DATABASE_URL: Optional[str] = None

    # Redis Configuration
    REDIS_HOST: Optional[str] = None
    REDIS_PORT: Optional[int] = None
    REDIS_URL: Optional[str] = None

    # Binance Configuration
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
        extra="ignore",  # ✅ Ignora variabili extra in .env
        protected_namespaces=(),  # ✅ Risolve warning "model_"
    )


def _truthy(v: str | None) -> bool:
    return (v or "").strip().lower() in {"1", "true", "yes", "y", "on"}


# ✅ Instantiate Settings ONCE
settings = Settings()

# ✅ Force SQLite in TESTING/CI to avoid accidental Postgres usage in tests/scripts
# This ensures tests use SQLite even if .env configures Postgres.
if _truthy(os.getenv("TESTING")) or _truthy(os.getenv("CI")):
    settings.TRADING_DATABASE_URL = "sqlite:///./data/trading.db"
    settings.MARKET_DATABASE_URL = "sqlite:///./data/market_data.db"
    settings.ANALYTICS_DATABASE_URL = "sqlite:///./data/analytics.db"
