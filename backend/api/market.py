"""Market data API endpoints."""

from fastapi import APIRouter, HTTPException, Query

from services.binance_service import binance_service

router = APIRouter(prefix="/api", tags=["market"])


@router.get("/klines/{symbol}/{interval}")
async def get_klines(
    symbol: str,
    interval: str,
    limit: int = Query(default=500, ge=1, le=1000)
):
    """
    Get klines (candlestick) data for a trading pair.
    
    Args:
        symbol: Trading pair symbol (e.g., BTCEUR)
        interval: Kline interval (e.g., 15m, 1h, 4h, 1d)
        limit: Number of klines to return (1-1000, default: 500)
    
    Returns:
        JSON response with klines data
    """
    try:
        data = binance_service.get_klines_data(
            symbol=symbol.upper(),
            interval=interval,
            limit=limit
        )
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error fetching klines: {str(e)}"
        )
