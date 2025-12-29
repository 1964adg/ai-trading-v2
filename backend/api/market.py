"""Market data API endpoints."""

from binance.exceptions import BinanceAPIException
from fastapi import APIRouter, HTTPException, Path, Query, WebSocket, WebSocketDisconnect

from services.binance_service import binance_service

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
