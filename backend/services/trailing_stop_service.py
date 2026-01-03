import asyncio
import logging
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class TrailingStopService:
    """Monitor and update trailing stops."""
    
    def __init__(self):
        self.running = False
        self.check_interval = 1  # seconds
    
    async def start(self):
        """Start monitoring trailing stops."""
        self.running = True
        logger.info("Trailing stop service started")
        asyncio.create_task(self._monitor_loop())
    
    async def stop(self):
        """Stop monitoring."""
        self.running = False
        logger.info("Trailing stop service stopped")
    
    async def _monitor_loop(self):
        """Main monitoring loop."""
        while self.running:
            try:
                from lib.database import get_db
                with get_db() as db:
                    await self._check_trailing_stops(db)
            except Exception as e:
                logger.error(f"Error in trailing stop monitoring: {e}")
            
            await asyncio.sleep(self.check_interval)
    
    async def _check_trailing_stops(self, db: Session):
        """Check all positions with trailing stops."""
        from models.position import Position, PositionStatus, PositionSide
        from services.binance_service import binance_service
        from services.paper_trading_service import paper_trading_service
        
        positions = db.query(Position).filter(
            Position.status == PositionStatus.OPEN,
            Position.trailing_stop_distance.isnot(None)
        ).all()
        
        for position in positions:
            try:
                # Get current price
                klines = binance_service.get_klines_data(
                    symbol=position.symbol,
                    interval="1m",
                    limit=1
                )
                
                if not klines:
                    continue
                
                current_price = klines[0]["close"]
                
                # Check if activated
                if position.trailing_stop_activation_price:
                    if position.side == PositionSide.BUY:
                        if current_price < position.trailing_stop_activation_price:
                            continue
                    else:
                        if current_price > position.trailing_stop_activation_price:
                            continue
                
                # Update trailing stop
                distance_pct = position.trailing_stop_distance / 100
                
                if position.side == PositionSide.BUY:
                    new_stop_loss = current_price * (1 - distance_pct)
                    
                    # Update only if higher
                    if not position.stop_loss or new_stop_loss > position.stop_loss:
                        position.stop_loss = new_stop_loss
                        db.commit()
                        logger.info(f"Updated trailing stop for {position.symbol}: {new_stop_loss:.2f}")
                    
                    # Check if stop loss hit
                    if position.stop_loss and current_price <= position.stop_loss:
                        logger.info(f"Trailing stop triggered for {position.symbol}")
                        paper_trading_service.close_position(position.id, current_price, db)
                
                else:  # SELL
                    new_stop_loss = current_price * (1 + distance_pct)
                    
                    # Update only if lower
                    if not position.stop_loss or new_stop_loss < position.stop_loss:
                        position.stop_loss = new_stop_loss
                        db.commit()
                        logger.info(f"Updated trailing stop for {position.symbol}: {new_stop_loss:.2f}")
                    
                    # Check if stop loss hit
                    if position.stop_loss and current_price >= position.stop_loss:
                        logger.info(f"Trailing stop triggered for {position.symbol}")
                        paper_trading_service.close_position(position.id, current_price, db)
                
            except Exception as e:
                logger.error(f"Error processing trailing stop for {position.id}: {e}")

# Singleton
trailing_stop_service = TrailingStopService()
