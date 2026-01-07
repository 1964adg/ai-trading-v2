from fastapi import APIRouter
from datetime import datetime
from config import settings
from lib.database import engines, check_database_health
from app.scout.ml_predictor import TORCH_AVAILABLE

router = APIRouter()


@router.get("/system/info")
async def get_system_info():
    """Get system configuration and status"""

    # Database status - Multi-database setup
    databases = check_database_health() if engines else {}

    # Overall status
    if databases:
        all_connected = all(status == "connected" for status in databases.values())
        database_status = "connected" if all_connected else "partial"
    else:
        database_status = "disconnected"

    # Determine database type (contract expected by tests)
    # - PostgreSQL when any DB is configured/visible
    # - In-Memory when nothing is initialized (CI/testing)
    db_type = "PostgreSQL" if databases else "In-Memory"

    return {
        "server": {
            "version": "2.0.0",
            "started": datetime.now().isoformat(),
            "port": settings.PORT,
            "environment": "development",
            "auto_reload": True,
        },
        "trading": {"mode": "paper", "live_trading": False, "realtime_enabled": True},
        "database": {
            "status": database_status,
            "type": db_type,
            "databases": databases,
            "urls": {
                "trading": (
                    settings.TRADING_DATABASE_URL.split("///")[1]
                    if "///" in settings.TRADING_DATABASE_URL
                    else settings.TRADING_DATABASE_URL
                ),
                "market": (
                    settings.MARKET_DATABASE_URL.split("///")[1]
                    if "///" in settings.MARKET_DATABASE_URL
                    else settings.MARKET_DATABASE_URL
                ),
                "analytics": (
                    settings.ANALYTICS_DATABASE_URL.split("///")[1]
                    if "///" in settings.ANALYTICS_DATABASE_URL
                    else settings.ANALYTICS_DATABASE_URL
                ),
            },
        },
        "ml_features": {
            "technical_analysis": True,
            "cnn_patterns": TORCH_AVAILABLE,
            "lstm_prediction": TORCH_AVAILABLE,
            "pytorch_available": TORCH_AVAILABLE,
        },
        "data_source": {
            "provider": "Binance Public API + WebSocket",
            "type": "real-time",
            "authenticated": False,
            "update_rate": "sub-second",
        },
        "configuration": {
            "cors_origins": settings.CORS_ORIGINS,
            "binance_url": settings.BINANCE_BASE_URL,
        },
    }
