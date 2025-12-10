"""WebSocket API endpoints for real-time data streaming."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.websocket_manager import websocket_manager
from services.realtime_service import realtime_service
from services.order_monitoring_service import order_monitoring_service
from services.binance_service import binance_service
import json

router = APIRouter()


@router.websocket("/ws/realtime")
async def websocket_realtime_endpoint(websocket: WebSocket):
    """
    Main WebSocket endpoint for all real-time data streams.
    
    Handles:
    - Market data updates (ticker)
    - Position updates
    - Portfolio updates
    - Advanced order updates
    
    Client sends commands:
    - {"action": "subscribe_ticker", "symbol": "BTCUSDT"}
    - {"action": "unsubscribe_ticker", "symbol": "BTCUSDT"}
    """
    await websocket_manager.connect(websocket)
    
    try:
        # Send connection acknowledgment
        await websocket_manager.send_to_client(websocket, {
            "type": "connection",
            "status": "connected",
            "message": "Real-time WebSocket connected"
        })
        
        # Start real-time service if not already running
        await realtime_service.start()
        
        # Handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                action = message.get("action")
                
                if action == "subscribe_ticker":
                    symbol = message.get("symbol")
                    if symbol:
                        await websocket_manager.subscribe(websocket, symbol)
                        await realtime_service.subscribe_to_ticker(symbol)
                        await websocket_manager.send_to_client(websocket, {
                            "type": "subscription",
                            "status": "success",
                            "symbol": symbol,
                            "message": f"Subscribed to {symbol}"
                        })
                
                elif action == "unsubscribe_ticker":
                    symbol = message.get("symbol")
                    if symbol:
                        await websocket_manager.unsubscribe(websocket, symbol)
                        # Note: We don't unsubscribe from service as other clients might be using it
                        await websocket_manager.send_to_client(websocket, {
                            "type": "subscription",
                            "status": "success",
                            "symbol": symbol,
                            "message": f"Unsubscribed from {symbol}"
                        })
                
                elif action == "get_positions":
                    # Send current positions immediately
                    from services.paper_trading_service import paper_trading_service
                    positions = paper_trading_service.get_positions()
                    await websocket_manager.send_to_client(websocket, {
                        "type": "POSITION_UPDATE",
                        "positions": positions,
                        "timestamp": int(__import__('datetime').datetime.now().timestamp() * 1000)
                    })
                
                elif action == "get_portfolio":
                    # Send current portfolio immediately
                    from services.paper_trading_service import paper_trading_service
                    portfolio = paper_trading_service.get_portfolio()
                    await websocket_manager.send_to_client(websocket, {
                        "type": "PORTFOLIO_UPDATE",
                        "portfolio": portfolio,
                        "timestamp": int(__import__('datetime').datetime.now().timestamp() * 1000)
                    })
                
                else:
                    await websocket_manager.send_to_client(websocket, {
                        "type": "error",
                        "message": f"Unknown action: {action}"
                    })
                    
            except WebSocketDisconnect:
                print("[WebSocket] Client disconnected")
                break
            except json.JSONDecodeError:
                await websocket_manager.send_to_client(websocket, {
                    "type": "error",
                    "message": "Invalid JSON format"
                })
            except Exception as e:
                print(f"[WebSocket] Error processing message: {e}")
                await websocket_manager.send_to_client(websocket, {
                    "type": "error",
                    "message": str(e)
                })
                
    except WebSocketDisconnect:
        print("[WebSocket] Client disconnected during setup")
    except Exception as e:
        print(f"[WebSocket] Unexpected error: {e}")
    finally:
        await websocket_manager.disconnect(websocket)
