from fastapi import APIRouter
from datetime import datetime
from config import settings
from lib.database import engine
from app.scout.ml_predictor import TORCH_AVAILABLE

router = APIRouter()


@router.get("/system/info")
async def get_system_info():
    """Get system configuration and status"""

    # Database status
    database_status = "disconnected"
    database_url = None
    if engine:
        try:
            with engine.connect():
                database_status = "connected"
                database_url = str(settings.DATABASE_URL).split("@")[0] + "@***"
        except:
            database_status = "error"

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
            "url": database_url,
            "type": "PostgreSQL" if database_status == "connected" else "In-Memory",
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
