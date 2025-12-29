"""Market data API endpoints."""

from binance.exceptions import BinanceAPIException
from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel
from typing import Optional, List
import pandas as pd
from datetime import datetime

from services.binance_service import binance_service
from lib.indicators import calculate_rsi, calculate_macd, calculate_bollinger_bands
from lib.risk_calculator import (
    calculate_position_size,
    calculate_risk_reward,
    calculate_portfolio_risk
)
from lib.backtester import Backtester, SimpleMAStrategy, RSIStrategy

router = APIRouter()


# ============================================================
# KLINES ENDPOINTS (esistenti)
# ============================================================

async def _fetch_klines_data(symbol: str, interval: str, limit: int):
    """
    Internal function to fetch klines data from Binance.
    Shared by both query params and path params endpoints.
    """
    try:
        data = binance_service.get_klines_data(
            symbol=symbol.upper(),
            interval=interval,
            limit=limit
        )

        if hasattr(data, 'to_dict'):
            data = data.to_dict('records')

        return {"success": True, "data": data}
    except BinanceAPIException as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {e.message}")
    except ConnectionError:
        raise HTTPException(status_code=503, detail="Unable to connect to Binance API")
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/klines")
async def get_klines_query(
    symbol: str = Query(..., description="Trading pair symbol (e.g., BTCEUR)"),
    timeframe: str = Query(..., description="Timeframe interval (e.g., 1m, 5m, 15m, 1h, 4h, 1d)"),
    limit: int = Query(100, description="Number of candles to return", ge=1, le=1000)
):
    """Get klines/candlestick data using query parameters."""
    return await _fetch_klines_data(symbol=symbol, interval=timeframe, limit=limit)


@router.get("/klines/{symbol}/{interval}")
async def get_klines_path(
    symbol:  str = Path(..., description="Trading pair symbol"),
    interval: str = Path(..., description="Kline interval"),
    limit: int = Query(default=500, ge=1, le=1000)
):
    """Get klines data using path parameters."""
    return await _fetch_klines_data(symbol=symbol, interval=interval, limit=limit)


# ============================================================
# TECHNICAL INDICATORS ENDPOINTS
# ============================================================

@router.get("/indicators/rsi/{symbol}/{interval}")
async def get_rsi(
    symbol: str = Path(..., description="Trading pair symbol"),
    interval: str = Path(..., description="Timeframe"),
    period: int = Query(14, description="RSI period", ge=2, le=100),
    limit: int = Query(100, description="Number of candles", ge=10, le=500)
):
    """Calculate RSI indicator"""
    try:
        klines_response = await _fetch_klines_data(symbol, interval, limit)

        if not klines_response['success']:
            raise HTTPException(status_code=404, detail="No klines data")

        df = pd.DataFrame(klines_response['data'])
        closes = df['close'].values

        result = calculate_rsi(closes, period)

        return {
            "success": True,
            "symbol": symbol,
            "interval":  interval,
            "indicator": "RSI",
            "period": period,
            **result
        }
    except Exception as e:
        print(f"[RSI ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/indicators/macd/{symbol}/{interval}")
async def get_macd(
    symbol: str = Path(...),
    interval: str = Path(...),
    fast: int = Query(12, ge=2, le=50),
    slow: int = Query(26, ge=2, le=100),
    signal: int = Query(9, ge=2, le=50),
    limit: int = Query(100, ge=20, le=500)
):
    """Calculate MACD indicator"""
    try:
        klines_response = await _fetch_klines_data(symbol, interval, limit)

        if not klines_response['success']:
            raise HTTPException(status_code=404, detail="No klines data")

        df = pd.DataFrame(klines_response['data'])
        closes = df['close'].values

        result = calculate_macd(closes, fast, slow, signal)

        return {
            "success": True,
            "symbol": symbol,
            "interval":  interval,
            "indicator": "MACD",
            **result
        }
    except Exception as e:
        print(f"[MACD ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/indicators/bollinger/{symbol}/{interval}")
async def get_bollinger(
    symbol: str = Path(...),
    interval: str = Path(...),
    period: int = Query(20, ge=2, le=100),
    std_dev: float = Query(2.0, ge=0.5, le=5.0),
    limit: int = Query(100, ge=20, le=500)
):
    """Calculate Bollinger Bands"""
    try:
        klines_response = await _fetch_klines_data(symbol, interval, limit)

        if not klines_response['success']:
            raise HTTPException(status_code=404, detail="No klines data")

        df = pd.DataFrame(klines_response['data'])
        closes = df['close'].values

        result = calculate_bollinger_bands(closes, period, std_dev)

        return {
            "success": True,
            "symbol": symbol,
            "interval": interval,
            "indicator": "Bollinger Bands",
            **result
        }
    except Exception as e:
        print(f"[BOLLINGER ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# RISK MANAGEMENT ENDPOINTS
# ============================================================

class PositionSizeRequest(BaseModel):
    account_balance: float
    risk_percentage: float
    entry_price: float
    stop_loss_price: float
    leverage: int = 1


class RiskRewardRequest(BaseModel):
    entry_price: float
    stop_loss_price: float
    take_profit_price: float
    position_size: Optional[float] = None


class PortfolioRiskRequest(BaseModel):
    account_balance: float
    positions: List[dict]
    max_risk_pct: float = 10.0


@router.post("/risk/position-size")
async def calculate_position_size_endpoint(request: PositionSizeRequest):
    """Calculate optimal position size"""
    try:
        result = calculate_position_size(
            account_balance=request.account_balance,
            risk_percentage=request.risk_percentage,
            entry_price=request.entry_price,
            stop_loss_price=request.stop_loss_price,
            leverage=request.leverage
        )

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return {"success": True, **result}
    except Exception as e:
        print(f"[RISK CALC ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risk/risk-reward")
async def calculate_risk_reward_endpoint(request:  RiskRewardRequest):
    """Calculate risk/reward ratio"""
    try:
        result = calculate_risk_reward(
            entry_price=request.entry_price,
            stop_loss_price=request.stop_loss_price,
            take_profit_price=request.take_profit_price,
            position_size=request.position_size
        )

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        return {"success":  True, **result}
    except Exception as e:
        print(f"[RR CALC ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/risk/portfolio")
async def calculate_portfolio_risk_endpoint(request: PortfolioRiskRequest):
    """Calculate portfolio risk"""
    try:
        result = calculate_portfolio_risk(
            account_balance=request.account_balance,
            positions=request.positions,
            max_risk_pct=request.max_risk_pct
        )

        return {"success": True, **result}
    except Exception as e:
        print(f"[PORTFOLIO RISK ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# BACKTESTING ENDPOINT
# ============================================================

class BacktestRequest(BaseModel):
    symbol: str
    timeframe: str
    strategy: str  # 'ma_cross' or 'rsi'
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    initial_capital: float = 10000
    position_size_pct: float = 100
    allow_shorts: bool = True
    # Strategy params
    fast_period: int = 9
    slow_period: int = 21
    rsi_period: int = 14
    rsi_oversold:  int = 30
    rsi_overbought: int = 70
    stop_loss_pct: float = 2.0
    take_profit_pct: float = 4.0


@router.post("/backtest")
async def run_backtest(request: BacktestRequest):
    """Run backtest on historical data"""
    try:
        # Fetch historical data
        limit = 1000
        klines_response = await _fetch_klines_data(request.symbol, request.timeframe, limit)

        if not klines_response['success'] or len(klines_response['data']) == 0:
            raise HTTPException(status_code=404, detail="No historical data found")

        # Convert to DataFrame
        df = pd.DataFrame(klines_response['data'])
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df.set_index('timestamp', inplace=True)

        # Filter by date range if provided
        if request.start_date:
            start = pd.to_datetime(request.start_date)
            df = df[df.index >= start]

        if request.end_date:
            end = pd.to_datetime(request.end_date)
            df = df[df.index <= end]

        if len(df) == 0:
            raise HTTPException(status_code=400, detail="No data in specified date range")

        # Create strategy
        if request.strategy == 'ma_cross':
            strategy = SimpleMAStrategy(
                fast_period=request.fast_period,
                slow_period=request.slow_period,
                stop_loss_pct=request.stop_loss_pct,
                take_profit_pct=request.take_profit_pct
            )
        elif request.strategy == 'rsi':
            strategy = RSIStrategy(
                period=request.rsi_period,
                oversold=request.rsi_oversold,
                overbought=request.rsi_overbought,
                stop_loss_pct=request.stop_loss_pct
            )
        else:
            raise HTTPException(status_code=400, detail="Unknown strategy")

        # Run backtest
        backtester = Backtester(
            data=df,
            strategy=strategy,
            initial_capital=request.initial_capital,
            position_size_pct=request.position_size_pct,
            allow_shorts=request.allow_shorts
        )

        result = backtester.run()

        return {
            "success": True,
            "symbol": request.symbol,
            "timeframe": request.timeframe,
            "strategy": request.strategy,
            **result.__dict__
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BACKTEST ERROR] {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
