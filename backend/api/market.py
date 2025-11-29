"""Market data API endpoints."""

from binance.exceptions import BinanceAPIException
from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect

from services.binance_service import binance_service

router = APIRouter()


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
            symbol=symbol. upper(),
            interval=interval,
            limit=limit
        )
        return {"success": True, "data": data}
    except BinanceAPIException as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {e. message}")
    except ConnectionError:
        raise HTTPException(status_code=503, detail="Unable to connect to Binance API")
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.websocket("/ws/klines/{symbol}/{interval}")
async def websocket_klines(websocket: WebSocket, symbol: str, interval: str):
    """WebSocket endpoint for real-time kline updates."""
    await websocket.accept()
    print(f"WebSocket connected: {symbol. upper()}/{interval}")
    
    try:
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "symbol": symbol.upper(),
            "interval": interval
        })
        
        async for kline_data in binance_service.stream_klines(symbol.upper(), interval):
            try:
                await websocket.send_json(kline_data)
            except WebSocketDisconnect:
                print(f"WebSocket disconnected: {symbol}/{interval}")
                break
            except Exception as e:
                print(f"Error sending data: {e}")
                break
                
    except WebSocketDisconnect:
        print(f"Client disconnected: {symbol}/{interval}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket. close(code=1011, reason=str(e))
        except:
            pass