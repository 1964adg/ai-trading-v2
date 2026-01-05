# -*- coding: utf-8 -*-
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api.market import router as market_router
from api.paper_trading import router as paper_trading_router
from api.advanced_orders import router as advanced_orders_router
from api.system import router as system_router
from api.ml import router as ml_router
from app.routers.ml_training import router as ml_training_router
from app.routers.scout import router as scout_router
from app.routers.websocket import router as websocket_router
from config import settings
from services.realtime_service import realtime_service
from services.websocket_manager import websocket_manager
from app.scout.ml_predictor import TORCH_AVAILABLE
import uvicorn
from datetime import datetime
import sys
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler - displays startup info and manages services"""
    is_reloading = (
        any("watchfiles" in arg.lower() for arg in sys.argv)
        or os.environ.get("RUN_MAIN") == "true"
    )

    # Initialize database
    from lib.database import init_database, create_tables, check_database_health
    from services.paper_trading_service import paper_trading_service

    db_initialized = init_database()
    if db_initialized:
        create_tables()
        paper_trading_service.set_database(True)
        db_health = check_database_health()
        print("[Startup] ✓ Multi-Database initialized successfully:")
        for db_name, status in db_health.items():
            print(f"  • {db_name.capitalize()} DB: {status.upper()}")
    else:
        print("[Startup] ⚠ Database initialization failed - using in-memory storage")

    banner = """
============================================================
AI TRADING BACKEND v2.0.0 - REAL-TIME WEBSOCKET EDITION
============================================================
Started: {timestamp}
Server: http://localhost:{port}

TRADING MODE:
  • Paper Trading: ENABLED (simulated trades, real prices)
  • Live Trading:  DISABLED
  • Real-Time:      ENABLED (WebSocket streaming)

ML FEATURES:
  • Technical Analysis: ENABLED
  • CNN Patterns:       {cnn_status}
  • LSTM Prediction:    {lstm_status}

DATA SOURCE:
  • Provider:       Binance Public API + WebSocket
  • Data Type:      Real-time market data (NOT simulated)
  • Authentication: Public endpoints (no API keys)
  • Update Rate:    Sub-second via WebSocket
  • Supported:      All Binance spot trading pairs

REAL-TIME FEATURES:
  • Market Data:    Live ticker and price updates
  • Positions:      Automatic P&L calculations (1s updates)
  • Portfolio:      Real-time balance tracking (2s updates)
  • Advanced Orders: Real-time monitoring and triggers
  • Latency:        <1 second for market data

CONFIGURATION:
  • CORS Origins:   {cors}
  • Auto-reload:    {reload}

AVAILABLE ENDPOINTS:
  • GET    /                           - Health check + server info
  • GET    /api/klines/{{symbol}}/{{interval}} - Real-time klines data
  • WS     /api/ws/klines/{{symbol}}/{{interval}} - Live kline stream (existing)
  • WS     /api/ws/realtime            - Main real-time WebSocket (NEW)
  • POST   /api/paper/order            - Create paper trading order
  • GET    /api/paper/positions        - Get active paper positions
  • GET    /api/paper/portfolio        - Get portfolio status
  • DELETE /api/paper/position/{{id}}  - Close a paper trading position

WEBSOCKET COMMANDS (ws://localhost:{port}/api/ws/realtime):
  Subscribe:   {{"action": "subscribe_ticker", "symbol": "BTCUSDT"}}
  Unsubscribe: {{"action": "unsubscribe_ticker", "symbol": "BTCUSDT"}}
  Positions:   {{"action": "get_positions"}}
  Portfolio:   {{"action": "get_portfolio"}}

TEST COMMANDS:
  curl http://localhost:{port}/
  curl "http://localhost:{port}/api/klines/BTCEUR/15m? limit=100"
  curl "http://localhost:{port}/api/klines/ETHEUR/1h?limit=50"

EXAMPLES:
  Symbols:   BTCEUR, ETHEUR, BNBEUR, SOLUSDT, ADAEUR
  Intervals: 1m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w
============================================================
    """

    cnn_status = "ENABLED" if TORCH_AVAILABLE else "DISABLED (install PyTorch)"
    lstm_status = "ENABLED" if TORCH_AVAILABLE else "DISABLED (install PyTorch)"

    print(
        banner.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            port=settings.PORT,
            cors=", ".join(settings.CORS_ORIGINS),
            reload="ENABLED",
            cnn_status=cnn_status,
            lstm_status=lstm_status,
        )
    )

    # Initialize cross-service connections
    from services.order_monitoring_service import order_monitoring_service
    from services.trailing_stop_service import trailing_stop_service

    order_monitoring_service.set_websocket_manager(websocket_manager)
    realtime_service.set_order_monitoring_service(order_monitoring_service)

    # Start real-time service
    print("[Startup] Initializing real-time data service...")
    await realtime_service.start()
    print("[Startup] Real-time service ready")

    # Start trailing stop service if database is enabled
    if paper_trading_service.use_database:
        await trailing_stop_service.start()
        print("[Startup] Trailing stop service started")

    yield

    # Cleanup
    print("\n" + "=" * 60)
    print("AI Trading Backend shutting down...")
    print("[Shutdown] Stopping real-time service...")
    await realtime_service.stop()
    print("[Shutdown] Real-time service stopped")

    # Stop trailing stop service
    from services.trailing_stop_service import trailing_stop_service

    await trailing_stop_service.stop()
    print("[Shutdown] Trailing stop service stopped")

    print("=" * 60)


app = FastAPI(
    title="AI Trading Backend - Real-Time Edition",
    version="2.0.0",
    description="Paper Trading Backend with Real-Time WebSocket Streaming",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(market_router, prefix="/api", tags=["market"])
app.include_router(system_router, prefix="/api", tags=["system"])
app.include_router(paper_trading_router, prefix="/api/paper", tags=["paper-trading"])
app.include_router(
    advanced_orders_router, prefix="/api/paper", tags=["advanced-orders"]
)
app.include_router(websocket_router, prefix="/api", tags=["websocket"])
app.include_router(ml_router, prefix="/api", tags=["ml"])
app.include_router(ml_training_router)
app.include_router(scout_router)


@app.get("/")
async def root():
    """Health check endpoint with server info"""
    return {
        "status": "online",
        "version": "2.0.0",
        "mode": "paper_trading",
        "realtime": True,
        "data_source": {
            "provider": "Binance Public API + WebSocket",
            "type": "real-time",
            "authenticated": False,
        },
        "features": {
            "klines": True,
            "websocket": True,
            "realtime_streaming": True,
            "paper_trading": True,
            "portfolio": True,
            "advanced_orders": True,
        },
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/health")
async def health_check():
    """Simple health check for Docker/Kubernetes"""
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=settings.PORT, reload=True)
