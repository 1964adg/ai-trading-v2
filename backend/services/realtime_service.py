# -*- coding: utf-8 -*-
"""Real-time data service for streaming market data and position updates."""

import asyncio
from typing import Dict, Set, Optional
from datetime import datetime
from services.websocket_manager import websocket_manager
from services.binance_service import binance_service
from services.paper_trading_service import paper_trading_service
import ssl


class RealTimeDataService:
    """Service for managing real-time data streams and updates."""
    
    def __init__(self):
        self.active_streams: Dict[str, asyncio.Task] = {}  # symbol -> stream task
        self.position_update_task: Optional[asyncio.Task] = None
        self.portfolio_update_task: Optional[asyncio.Task] = None
        self.order_monitoring_task: Optional[asyncio.Task] = None
        self._running = False
        self._position_update_interval = 1.0  # Update positions every 1 second
        self._portfolio_update_interval = 2.0  # Update portfolio every 2 seconds
        self._order_monitoring_service = None  # Will be set to avoid circular import
    
    def set_order_monitoring_service(self, service):
        """Set the order monitoring service for advanced order updates."""
        self._order_monitoring_service = service
    
    async def start(self):
        """Start the real-time data service."""
        if self._running:
            return
        
        self._running = True
        print("[Real-Time Service] Starting background tasks...")
        
        # Start position update task
        self.position_update_task = asyncio.create_task(self._position_update_loop())
        
        # Start portfolio update task
        self.portfolio_update_task = asyncio.create_task(self._portfolio_update_loop())
        
        print("[Real-Time Service] Background tasks started")
    
    async def stop(self):
        """Stop the real-time data service."""
        self._running = False
        
        # Cancel position update task
        if self.position_update_task:
            self.position_update_task.cancel()
            try:
                await self.position_update_task
            except asyncio.CancelledError:
                pass
        
        # Cancel portfolio update task
        if self.portfolio_update_task:
            self.portfolio_update_task.cancel()
            try:
                await self.portfolio_update_task
            except asyncio.CancelledError:
                pass
        
        # Cancel all active streams
        for task in self.active_streams.values():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        self.active_streams.clear()
        print("[Real-Time Service] Stopped")
    
    async def subscribe_to_ticker(self, symbol: str):
        """Subscribe to real-time ticker updates for a symbol."""
        if symbol in self.active_streams:
            print(f"[Real-Time Service] Already streaming {symbol}")
            return
        
        # Create a stream task for this symbol
        task = asyncio.create_task(self._stream_ticker(symbol))
        self.active_streams[symbol] = task
        print(f"[Real-Time Service] Started ticker stream for {symbol}")
    
    async def unsubscribe_from_ticker(self, symbol: str):
        """Unsubscribe from ticker updates for a symbol."""
        if symbol not in self.active_streams:
            return
        
        task = self.active_streams.pop(symbol)
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        
        print(f"[Real-Time Service] Stopped ticker stream for {symbol}")
    
    async def _stream_ticker(self, symbol: str):
        """Stream real-time ticker data from Binance WebSocket."""
        import websockets
        import json
        
        # Create SSL context
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        ws_url = f"wss://stream.binance.com:9443/ws/{symbol.lower()}@ticker"
        
        while self._running:
            try:
                async with websockets.connect(
                    ws_url,
                    ssl=ssl_context,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=5
                ) as ws:
                    print(f"[Real-Time Service] Connected to ticker stream: {symbol}")
                    
                    async for message in ws:
                        if not self._running:
                            break
                        
                        data = json.loads(message)
                        
                        # Format ticker data
                        ticker_update = {
                            "type": "MARKET_UPDATE",
                            "symbol": data['s'],
                            "price": float(data['c']),
                            "priceChange": float(data['p']),
                            "priceChangePercent": float(data['P']),
                            "high": float(data['h']),
                            "low": float(data['l']),
                            "volume": float(data['v']),
                            "timestamp": int(data['E'])
                        }
                        
                        # Update order monitoring service with new price
                        if self._order_monitoring_service:
                            self._order_monitoring_service.update_market_price(
                                symbol, float(data['c'])
                            )
                        
                        # Broadcast to subscribed clients
                        await websocket_manager.broadcast_to_symbol(symbol, ticker_update)
                        
            except asyncio.CancelledError:
                print(f"[Real-Time Service] Ticker stream cancelled: {symbol}")
                break
            except Exception as e:
                print(f"[Real-Time Service] Ticker stream error for {symbol}: {e}")
                if self._running:
                    await asyncio.sleep(3)  # Reconnect delay
                else:
                    break
    
    async def _position_update_loop(self):
        """Background task to calculate and broadcast position updates."""
        while self._running:
            try:
                await asyncio.sleep(self._position_update_interval)
                
                # Get all open positions
                positions = paper_trading_service.get_positions()
                
                if not positions:
                    continue
                
                # Update each position with current price
                updated_positions = []
                for position in positions:
                    try:
                        # Fetch current market price
                        klines = binance_service.get_klines_data(
                            symbol=position["symbol"],
                            interval="1m",
                            limit=1
                        )
                        if klines:
                            current_price = klines[0]["close"]
                            # Update position price in service
                            paper_trading_service.update_position_price(position["id"], current_price)
                            updated_positions.append(position["id"])
                    except Exception as e:
                        print(f"[Real-Time Service] Error updating position {position['id']}: {e}")
                
                # Get fresh positions after updates
                if updated_positions:
                    positions = paper_trading_service.get_positions()
                    
                    # Broadcast position updates
                    await websocket_manager.broadcast_to_all({
                        "type": "POSITION_UPDATE",
                        "positions": positions,
                        "timestamp": int(datetime.now().timestamp() * 1000)
                    })
                
            except asyncio.CancelledError:
                print("[Real-Time Service] Position update loop cancelled")
                break
            except Exception as e:
                print(f"[Real-Time Service] Position update error: {e}")
    
    async def _portfolio_update_loop(self):
        """Background task to calculate and broadcast portfolio updates."""
        while self._running:
            try:
                await asyncio.sleep(self._portfolio_update_interval)
                
                # Get portfolio status
                portfolio = paper_trading_service.get_portfolio()
                
                # Broadcast portfolio update
                await websocket_manager.broadcast_to_all({
                    "type": "PORTFOLIO_UPDATE",
                    "portfolio": portfolio,
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })
                
            except asyncio.CancelledError:
                print("[Real-Time Service] Portfolio update loop cancelled")
                break
            except Exception as e:
                print(f"[Real-Time Service] Portfolio update error: {e}")


# Singleton instance
realtime_service = RealTimeDataService()
