# -*- coding: utf-8 -*-
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api. market import router as market_router
from config import settings
import uvicorn
from datetime import datetime
import sys  # Aggiungi in alto con gli altri import
import os  # ← AGGIUNGI QUESTA RIGA

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler - displays startup info"""
    # Detect if running with reload (presenza del reloader process)
    is_reloading = any('watchfiles' in arg. lower() for arg in sys.argv) or \
                   os.environ.get('RUN_MAIN') == 'true'
    
    banner = """
============================================================
AI TRADING BACKEND v1.0. 0
============================================================
Started: {timestamp}
Server: http://localhost:{port}

TRADING MODE:
  • Paper Trading: ENABLED (simulated trades, real prices)
  • Live Trading:  DISABLED

DATA SOURCE:
  • Provider:       Binance Public API
  • Data Type:      Real-time market data (NOT simulated)
  • Authentication: Public endpoints (no API keys)
  • Update Rate:    Live candlestick data
  • Supported:      All Binance spot trading pairs

CONFIGURATION:
  • CORS Origins:   {cors}
  • Auto-reload:    {reload}

AVAILABLE ENDPOINTS:
  • GET  /                           - Health check + server info
  • GET  /api/klines/{{symbol}}/{{interval}} - Real-time klines data

TEST COMMANDS:
  curl http://localhost:{port}/
  curl "http://localhost:{port}/api/klines/BTCEUR/15m?limit=100"
  curl "http://localhost:{port}/api/klines/ETHEUR/1h?limit=50"

EXAMPLES:
  Symbols:   BTCEUR, ETHEUR, BNBEUR, SOLUSDT, ADAEUR
  Intervals: 1m, 5m, 15m, 30m, 1h, 4h, 1d
============================================================
    """
    # In realtà auto-reload è sempre ENABLED quando usi python main.py
    print(banner. format(
        timestamp=datetime. now(). strftime('%Y-%m-%d %H:%M:%S'),
        port=settings.PORT,
        cors=', '.join(settings.CORS_ORIGINS),
        reload='ENABLED'  # Hardcoded perché reload=True in uvicorn. run()
    ))
    
    yield
    
    print("\n" + "="*60)
    print("AI Trading Backend shutting down...")
    print("="*60)

app = FastAPI(
    title="AI Trading Backend",
    version="1.0.0",
    description="Paper Trading Backend - Real-time crypto market data",
    lifespan=lifespan  # New way! 
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market_router, prefix="/api", tags=["market"])


@app.get("/")
async def root():
    """Health check endpoint with server info"""
    return {
        "status": "online",
        "version": "1.0.0",
        "mode": "paper_trading",
        "data_source": {
            "provider": "Binance Public API",
            "type": "real-time",
            "authenticated": False
        },
        "features": {
            "klines": True,
            "websocket": False,
            "portfolio": False
        },
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",  # <- CAMBIATO DA 0.0.0.0
        port=settings.PORT,
        reload=True
    )