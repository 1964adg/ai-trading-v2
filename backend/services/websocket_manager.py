# -*- coding: utf-8 -*-
"""WebSocket connection manager for real-time data broadcasting."""

from fastapi import WebSocket
from typing import List, Dict, Set
import asyncio
import json
from datetime import datetime


class ConnectionManager:
    """Manages WebSocket connections and broadcasts real-time updates."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[str, Set[WebSocket]] = {}  # symbol -> set of websockets
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        print(f"[WebSocket Manager] New connection. Total: {len(self.active_connections)}")
    
    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection and clean up subscriptions."""
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            
            # Remove from all subscriptions
            for symbol in list(self.subscriptions.keys()):
                if websocket in self.subscriptions[symbol]:
                    self.subscriptions[symbol].remove(websocket)
                if not self.subscriptions[symbol]:
                    del self.subscriptions[symbol]
        
        print(f"[WebSocket Manager] Connection closed. Total: {len(self.active_connections)}")
    
    async def subscribe(self, websocket: WebSocket, symbol: str):
        """Subscribe a WebSocket to updates for a specific symbol."""
        async with self._lock:
            if symbol not in self.subscriptions:
                self.subscriptions[symbol] = set()
            self.subscriptions[symbol].add(websocket)
        print(f"[WebSocket Manager] Client subscribed to {symbol}")
    
    async def unsubscribe(self, websocket: WebSocket, symbol: str):
        """Unsubscribe a WebSocket from updates for a specific symbol."""
        async with self._lock:
            if symbol in self.subscriptions and websocket in self.subscriptions[symbol]:
                self.subscriptions[symbol].remove(websocket)
                if not self.subscriptions[symbol]:
                    del self.subscriptions[symbol]
        print(f"[WebSocket Manager] Client unsubscribed from {symbol}")
    
    async def broadcast_to_all(self, message: Dict):
        """Broadcast a message to all connected clients."""
        if not self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WebSocket Manager] Error broadcasting: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            await self.disconnect(conn)
    
    async def broadcast_to_symbol(self, symbol: str, message: Dict):
        """Broadcast a message to all clients subscribed to a symbol."""
        async with self._lock:
            subscribers = self.subscriptions.get(symbol, set()).copy()
        
        if not subscribers:
            return
        
        disconnected = []
        for connection in subscribers:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"[WebSocket Manager] Error broadcasting to {symbol}: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            await self.disconnect(conn)
    
    async def send_to_client(self, websocket: WebSocket, message: Dict):
        """Send a message to a specific client."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"[WebSocket Manager] Error sending to client: {e}")
            await self.disconnect(websocket)


# Singleton instance
websocket_manager = ConnectionManager()
