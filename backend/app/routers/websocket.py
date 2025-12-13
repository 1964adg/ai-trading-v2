"""
WebSocket Router for Real-Time Scout Updates
"""
import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
from datetime import datetime

from app.scout.scout_service import scout_service
from app.scout.alert_manager import alert_manager
from app.scout.models import WebSocketMessage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scout", tags=["websocket"])


class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        """Accept new connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected.Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove connection"""
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected.Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Broadcast error: {e}")
                disconnected.append(connection)
        
        # Remove dead connections
        for conn in disconnected:
            try:
                self.disconnect(conn)
            except: 
                pass


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket:  WebSocket):
    """
    WebSocket endpoint for real-time scout updates
    
    Sends: 
    - Opportunities every 60 seconds
    - Market overview every 60 seconds
    - Alerts in real-time
    - Status updates
    """
    await manager.connect(websocket)
    
    try:
        # Send initial status
        status = scout_service.get_status()
        await manager.send_personal_message(
            WebSocketMessage(
                type="status",
                data=status.dict()
            ).dict(),
            websocket
        )
        
        # Background task for periodic updates
        update_task = asyncio.create_task(
            periodic_updates(websocket)
        )
        
        # Listen for client messages
        while True:
            try:
                # Wait for messages from client
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=1.0
                )
                
                # Handle client commands
                try:
                    command = json.loads(data)
                    await handle_client_command(command, websocket)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON from client: {data}")
                    
            except asyncio.TimeoutError:
                # No message from client, continue
                continue
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("Client disconnected normally")
    except Exception as e: 
        logger.error(f"WebSocket error: {e}")
        try:
            manager.disconnect(websocket)
        except:
            pass
    finally:
        # Cancel update task
        if 'update_task' in locals():
            update_task.cancel()


async def periodic_updates(websocket: WebSocket):
    """Send periodic updates to client"""
    
    while True:
        try: 
            # Scan for opportunities
            opportunities = await scout_service.scan(min_score=0)
            
            # Send opportunities
            await manager.send_personal_message(
                WebSocketMessage(
                    type="opportunities",
                    data={
                        "opportunities": [opp.dict() for opp in opportunities[: 20]],
                        "count": len(opportunities)
                    }
                ).dict(),
                websocket
            )
            
            # Send market overview
            market_overview = await scout_service.get_market_overview()
            await manager.send_personal_message(
                WebSocketMessage(
                    type="market_overview",
                    data=market_overview.dict()
                ).dict(),
                websocket
            )
            
            # Check for alerts
            for opp in opportunities:
                alerts = alert_manager.check_opportunity(opp)
                for alert in alerts:
                    if alert:   # Skip rate-limited alerts
                        await manager.send_personal_message(
                            WebSocketMessage(
                                type="alert",
                                data=alert.dict()
                            ).dict(),
                            websocket
                        )
            
            # Wait 60 seconds before next update
            await asyncio.sleep(60)
            
        except Exception as e:
            logger.error(f"Error in periodic updates: {e}")
            await asyncio.sleep(10)  # Wait before retry


async def handle_client_command(command: dict, websocket: WebSocket):
    """Handle commands from client"""
    
    cmd_type = command.get("type")
    
    if cmd_type == "get_status":
        status = scout_service.get_status()
        await manager.send_personal_message(
            WebSocketMessage(type="status", data=status.dict()).dict(),
            websocket
        )
    
    elif cmd_type == "get_config":
        config = alert_manager.get_config()
        await manager.send_personal_message(
            WebSocketMessage(type="config", data=config.dict()).dict(),
            websocket
        )
    
    elif cmd_type == "scan_now":
        opportunities = await scout_service.scan(min_score=command.get("min_score", 0))
        await manager.send_personal_message(
            WebSocketMessage(
                type="opportunities",
                data={"opportunities": [opp.dict() for opp in opportunities]}
            ).dict(),
            websocket
        )
    
    else:
        logger.warning(f"Unknown command:  {cmd_type}")