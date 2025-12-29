"""Market data API endpoints."""

import numpy as np
from binance.exceptions import BinanceAPIException
from fastapi import APIRouter, HTTPException, Path, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Optional

from services.binance_service import binance_service
from lib.indicators import calculate_rsi, calculate_macd, calculate_bollinger_bands
from lib.risk_calculator import (
    calculate_position_size as calc_position_size,
    calculate_risk_reward as calc_risk_reward,
    calculate_portfolio_risk as calc_portfolio_risk
)

router = APIRouter()


async def _fetch_klines_data(symbol: str, interval: str, limit: int):
    """
    Internal function to fetch klines data from Binance.
    Shared by both query params and path params endpoints.

    Args:
        symbol: Trading pair symbol (e.g., BTCEUR)
        interval: Kline interval (e.g., 1m, 5m, 15m, 1h, 4h, 1d)
        limit: Number of klines to return (1-1000)

    Returns:
        JSON response with klines data
    """
    try:
        data = binance_service.get_klines_data(
            symbol=symbol.upper(),
            interval=interval,
            limit=limit
        )

        # ✅ Convert DataFrame to dict for fast JSON serialization
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
    """
    Get klines/candlestick data using query parameters.

    This endpoint supports the frontend format:
    GET /api/klines?symbol=BTCEUR&timeframe=1m&limit=100

    Args:
        symbol: Trading pair symbol (e.g., BTCEUR)
        timeframe: Timeframe interval (e.g., 1m, 5m, 15m, 1h, 4h, 1d)
        limit: Number of candles to return (1-1000, default:  100)

    Returns:
        JSON response with klines data (same format as path params endpoint)
    """
    return await _fetch_klines_data(symbol=symbol, interval=timeframe, limit=limit)


@router.get("/klines/{symbol}/{interval}")
async def get_klines_path(
    symbol: str = Path(..., description="Trading pair symbol"),
    interval: str = Path(..., description="Kline interval"),
    limit: int = Query(default=500, ge=1, le=1000)
):
    """
    Get klines (candlestick) data using path parameters.

    Supports:  GET /api/klines/BTCEUR/1m?limit=500

    Args:
        symbol: Trading pair symbol (e.g., BTCEUR)
        interval: Kline interval (e.g., 15m, 1h, 4h, 1d)
        limit: Number of klines to return (1-1000, default: 500)

    Returns:
        JSON response with klines data
    """
    return await _fetch_klines_data(symbol=symbol, interval=interval, limit=limit)


# ============================================================================
# PHASE A: TECHNICAL INDICATORS ENDPOINTS
# ============================================================================

@router.get("/indicators/rsi/{symbol}/{interval}")
async def get_rsi(
    symbol: str = Path(..., description="Trading pair symbol"),
    interval: str = Path(..., description="Kline interval"),
    period: int = Query(default=14, ge=2, le=100, description="RSI period"),
    limit: int = Query(default=100, ge=1, le=1000, description="Number of klines")
):
    """
    Calculate RSI indicator for a symbol.
    
    Args:
        symbol: Trading pair (e.g., BTCEUR)
        interval: Timeframe (e.g., 1h, 4h, 1d)
        period: RSI period (default: 14)
        limit: Number of candles to fetch
        
    Returns:
        RSI value, signal, and historical data
    """
    try:
        # Fetch historical data
        klines = binance_service.get_klines_data(
            symbol=symbol.upper(),
            interval=interval,
            limit=limit
        )
        
        # Convert to dict if DataFrame
        if hasattr(klines, 'to_dict'):
            klines = klines.to_dict('records')
        
        # Extract close prices
        close_prices = np.array([float(k['close']) for k in klines])
        
        # Calculate RSI
        rsi_result = calculate_rsi(close_prices, period=period)
        
        # Build response with historical data
        rsi_data = []
        for i, k in enumerate(klines):
            if i >= period:
                # Calculate RSI for each point
                rsi_val = calculate_rsi(close_prices[:i+1], period=period)
                rsi_data.append({
                    "timestamp": k.get('timestamp', k.get('time', '')),
                    "close": float(k['close']),
                    "rsi": rsi_val.get('current_rsi')
                })
            else:
                rsi_data.append({
                    "timestamp": k.get('timestamp', k.get('time', '')),
                    "close": float(k['close']),
                    "rsi": None
                })
        
        return {
            "success": True,
            "symbol": symbol.upper(),
            "interval": interval,
            "period": period,
            "current_rsi": rsi_result['current_rsi'],
            "signal": {
                "signal": rsi_result['signal'],
                "description": rsi_result['description'],
                "color": "green" if rsi_result['signal'] == "BUY" else "red" if rsi_result['signal'] == "SELL" else "gray"
            },
            "data": rsi_data
        }
        
    except BinanceAPIException as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {e.message}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/indicators/macd/{symbol}/{interval}")
async def get_macd(
    symbol: str = Path(..., description="Trading pair symbol"),
    interval: str = Path(..., description="Kline interval"),
    fast: int = Query(default=12, ge=2, le=50, description="Fast EMA period"),
    slow: int = Query(default=26, ge=2, le=100, description="Slow EMA period"),
    signal: int = Query(default=9, ge=2, le=50, description="Signal line period"),
    limit: int = Query(default=100, ge=1, le=1000, description="Number of klines")
):
    """
    Calculate MACD indicator for a symbol.
    
    Args:
        symbol: Trading pair (e.g., BTCEUR)
        interval: Timeframe (e.g., 1h, 4h, 1d)
        fast: Fast EMA period (default: 12)
        slow: Slow EMA period (default: 26)
        signal: Signal line period (default: 9)
        limit: Number of candles to fetch
        
    Returns:
        MACD line, signal line, histogram, and trading signal
    """
    try:
        # Fetch historical data
        klines = binance_service.get_klines_data(
            symbol=symbol.upper(),
            interval=interval,
            limit=limit
        )
        
        # Convert to dict if DataFrame
        if hasattr(klines, 'to_dict'):
            klines = klines.to_dict('records')
        
        # Extract close prices
        close_prices = np.array([float(k['close']) for k in klines])
        
        # Calculate MACD
        macd_result = calculate_macd(close_prices, fast=fast, slow=slow, signal=signal)
        
        # Build response with historical data
        macd_data = []
        min_length = slow + signal
        for i, k in enumerate(klines):
            if i >= min_length - 1:
                macd_val = calculate_macd(close_prices[:i+1], fast=fast, slow=slow, signal=signal)
                macd_data.append({
                    "timestamp": k.get('timestamp', k.get('time', '')),
                    "close": float(k['close']),
                    "macd": macd_val.get('macd'),
                    "signal": macd_val.get('signal_line'),
                    "histogram": macd_val.get('histogram')
                })
            else:
                macd_data.append({
                    "timestamp": k.get('timestamp', k.get('time', '')),
                    "close": float(k['close']),
                    "macd": None,
                    "signal": None,
                    "histogram": None
                })
        
        return {
            "success": True,
            "symbol": symbol.upper(),
            "interval": interval,
            "current": {
                "macd": macd_result['macd'],
                "signal": macd_result['signal_line'],
                "histogram": macd_result['histogram'],
                "signal_type": "bullish" if macd_result['signal'] == "BUY" else "bearish" if macd_result['signal'] == "SELL" else "neutral"
            },
            "signal": {
                "signal": macd_result['signal'],
                "description": macd_result['description']
            },
            "data": macd_data
        }
        
    except BinanceAPIException as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {e.message}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/indicators/bollinger/{symbol}/{interval}")
async def get_bollinger(
    symbol: str = Path(..., description="Trading pair symbol"),
    interval: str = Path(..., description="Kline interval"),
    period: int = Query(default=20, ge=2, le=100, description="Moving average period"),
    std_dev: float = Query(default=2.0, ge=0.5, le=5.0, description="Standard deviation multiplier"),
    limit: int = Query(default=100, ge=1, le=1000, description="Number of klines")
):
    """
    Calculate Bollinger Bands indicator for a symbol.
    
    Args:
        symbol: Trading pair (e.g., BTCEUR)
        interval: Timeframe (e.g., 1h, 4h, 1d)
        period: Moving average period (default: 20)
        std_dev: Standard deviation multiplier (default: 2.0)
        limit: Number of candles to fetch
        
    Returns:
        Upper, middle, lower bands with signal
    """
    try:
        # Fetch historical data
        klines = binance_service.get_klines_data(
            symbol=symbol.upper(),
            interval=interval,
            limit=limit
        )
        
        # Convert to dict if DataFrame
        if hasattr(klines, 'to_dict'):
            klines = klines.to_dict('records')
        
        # Extract close prices
        close_prices = np.array([float(k['close']) for k in klines])
        
        # Calculate Bollinger Bands
        bb_result = calculate_bollinger_bands(close_prices, period=period, std_dev=std_dev)
        
        # Build response with historical data
        bb_data = []
        for i, k in enumerate(klines):
            if i >= period - 1:
                bb_val = calculate_bollinger_bands(close_prices[:i+1], period=period, std_dev=std_dev)
                bb_data.append({
                    "timestamp": k.get('timestamp', k.get('time', '')),
                    "close": float(k['close']),
                    "bb_upper": bb_val.get('upper'),
                    "bb_middle": bb_val.get('middle'),
                    "bb_lower": bb_val.get('lower'),
                    "bb_bandwidth": bb_val.get('bandwidth')
                })
            else:
                bb_data.append({
                    "timestamp": k.get('timestamp', k.get('time', '')),
                    "close": float(k['close']),
                    "bb_upper": None,
                    "bb_middle": None,
                    "bb_lower": None,
                    "bb_bandwidth": None
                })
        
        # Determine position relative to bands
        if bb_result['current_price'] and bb_result['lower'] and bb_result['upper']:
            if bb_result['current_price'] < bb_result['lower']:
                position = "below_lower"
            elif bb_result['current_price'] > bb_result['upper']:
                position = "above_upper"
            else:
                position = "within_bands"
        else:
            position = "unknown"
        
        return {
            "success": True,
            "symbol": symbol.upper(),
            "interval": interval,
            "current": {
                "price": bb_result['current_price'],
                "upper": bb_result['upper'],
                "middle": bb_result['middle'],
                "lower": bb_result['lower'],
                "bandwidth": bb_result['bandwidth'],
                "position": position,
                "signal": bb_result['signal'].lower()
            },
            "signal": {
                "signal": bb_result['signal'],
                "description": bb_result['description']
            },
            "data": bb_data
        }
        
    except BinanceAPIException as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {e.message}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ============================================================================
# PHASE B: RISK MANAGEMENT ENDPOINTS
# ============================================================================

class PositionSizeRequest(BaseModel):
    """Request model for position size calculation."""
    account_balance: float
    risk_percentage: float
    entry_price: float
    stop_loss_price: float
    leverage: int = 1


@router.post("/risk/position-size")
async def calculate_position_size_endpoint(request: PositionSizeRequest):
    """
    Calculate optimal position size based on risk parameters.
    
    Args:
        request: PositionSizeRequest with account balance, risk %, entry, stop-loss, leverage
        
    Returns:
        Position size, quantity, risk amount, and safety warnings
    """
    try:
        result = calc_position_size(
            account_balance=request.account_balance,
            risk_percentage=request.risk_percentage,
            entry_price=request.entry_price,
            stop_loss_price=request.stop_loss_price,
            leverage=request.leverage
        )
        
        return {
            "success": True,
            **result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


class RiskRewardRequest(BaseModel):
    """Request model for risk/reward calculation."""
    entry_price: float
    stop_loss_price: float
    take_profit_price: float
    position_size: Optional[float] = None


@router.post("/risk/risk-reward")
async def calculate_risk_reward_endpoint(request: RiskRewardRequest):
    """
    Calculate risk/reward ratio for a trade.
    
    Args:
        request: RiskRewardRequest with entry, stop-loss, take-profit, optional position size
        
    Returns:
        R:R ratio, direction, risk/reward percentages, potential P/L, recommendations
    """
    try:
        result = calc_risk_reward(
            entry_price=request.entry_price,
            stop_loss_price=request.stop_loss_price,
            take_profit_price=request.take_profit_price,
            position_size=request.position_size
        )
        
        return {
            "success": True,
            **result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


class PortfolioRiskRequest(BaseModel):
    """Request model for portfolio risk calculation."""
    account_balance: float
    positions: List[dict]
    max_risk_pct: float = 10.0


@router.post("/risk/portfolio")
async def calculate_portfolio_risk_endpoint(request: PortfolioRiskRequest):
    """
    Calculate aggregate risk across multiple positions.
    
    Args:
        request: PortfolioRiskRequest with account balance, positions list, max risk %
        
    Returns:
        Total exposure, risk percentage, positions analyzed, warnings
    """
    try:
        result = calc_portfolio_risk(
            account_balance=request.account_balance,
            positions=request.positions,
            max_risk_pct=request.max_risk_pct
        )
        
        return {
            "success": True,
            **result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


