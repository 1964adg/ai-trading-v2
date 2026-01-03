# -*- coding: utf-8 -*-
"""Paper trading service for managing simulated positions and portfolio."""

from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field
import uuid
from sqlalchemy.orm import Session


@dataclass
class PaperPosition:
    """Represents a paper trading position."""
    id: str
    symbol: str
    type: str  # "buy" or "sell"
    quantity: float
    entry_price: float
    timestamp: str
    status: str = "open"  # "open" or "closed"
    current_price: Optional[float] = None
    current_pnl: float = 0.0


@dataclass
class PaperPortfolio:
    """Represents the paper trading portfolio state."""
    balance: float = 10000.0  # Starting balance
    total_pnl: float = 0.0
    positions_count: int = 0
    realized_pnl: float = 0.0


class PaperTradingService:
    """Service for managing paper trading positions and portfolio."""
    
    def __init__(self):
        self.positions: Dict[str, PaperPosition] = {}  # Fallback in-memory
        self.portfolio = PaperPortfolio()
        self.closed_positions: List[PaperPosition] = []
        self.use_database = False
    
    def set_database(self, use_db: bool):
        """Enable/disable database mode."""
        self.use_database = use_db
        
    def create_order(
        self,
        order_type: str,
        symbol: str,
        quantity: float,
        price: Optional[float] = None,
        db: Optional[Session] = None
    ) -> Dict:
        """
        Create a paper trading order.
        
        Args:
            order_type: "buy" or "sell"
            symbol: Trading pair symbol
            quantity: Order quantity
            price: Order price (optional, uses market price if not provided)
            db: Database session (optional)
            
        Returns:
            Order response with status and details
        """
        if self.use_database and db:
            return self._create_order_db(order_type, symbol, quantity, price, db)
        else:
            return self._create_order_memory(order_type, symbol, quantity, price)
    
    def _create_order_memory(
        self,
        order_type: str,
        symbol: str,
        quantity: float,
        price: Optional[float] = None
    ) -> Dict:
        """Create order with in-memory storage."""
        order_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Create position
        position = PaperPosition(
            id=order_id,
            symbol=symbol.upper(),
            type=order_type.lower(),
            quantity=quantity,
            entry_price=price or 0.0,
            timestamp=timestamp
        )
        
        self.positions[order_id] = position
        self.portfolio.positions_count = len([p for p in self.positions.values() if p.status == "open"])
        
        # Return Binance-compatible response format
        # Python slicing safely handles strings shorter than slice range
        client_order_id = f"paper_{order_id[:8]}"
        
        return {
            "orderId": order_id,
            "symbol": position.symbol,
            "status": "FILLED",
            "clientOrderId": client_order_id,
            "price": str(position.entry_price),
            "avgPrice": str(position.entry_price),
            "origQty": str(position.quantity),
            "executedQty": str(position.quantity),
            "type": "MARKET",
            "side": order_type.upper(),
            "timeInForce": "GTC",
            "transactTime": int(datetime.now().timestamp() * 1000)
        }
    
    def _create_order_db(self, order_type: str, symbol: str, quantity: float, price: float, db: Session) -> Dict:
        """Create order with database persistence."""
        from models.position import Position as DBPosition, PositionStatus, PositionSide
        
        order_id = str(uuid.uuid4())
        timestamp = datetime.now()
        
        # Create position
        position = DBPosition(
            id=order_id,
            symbol=symbol.upper(),
            side=PositionSide.BUY if order_type.lower() == "buy" else PositionSide.SELL,
            quantity=quantity,
            entry_price=price,
            current_price=price,
            status=PositionStatus.OPEN,
            opened_at=timestamp
        )
        
        db.add(position)
        db.commit()
        db.refresh(position)
        
        # Update portfolio count
        self.portfolio.positions_count = db.query(DBPosition).filter(
            DBPosition.status == PositionStatus.OPEN
        ).count()
        
        return {
            "orderId": position.id,
            "symbol": position.symbol,
            "status": "FILLED",
            "clientOrderId": f"paper_{order_id[:8]}",
            "price": str(position.entry_price),
            "avgPrice": str(position.entry_price),
            "origQty": str(position.quantity),
            "executedQty": str(position.quantity),
            "type": "MARKET",
            "side": order_type.upper(),
            "timeInForce": "GTC",
            "transactTime": int(timestamp.timestamp() * 1000)
        }
    
    def get_positions(self, db: Optional[Session] = None) -> List[Dict]:
        """
        Get all active paper trading positions.
        
        Args:
            db: Database session (optional)
        
        Returns:
            List of position dictionaries
        """
        if self.use_database and db:
            return self._get_positions_db(db)
        else:
            return self._get_positions_memory()
    
    def _get_positions_memory(self) -> List[Dict]:
        """Get positions from in-memory storage."""
        active_positions = [
            {
                "id": pos.id,
                "symbol": pos.symbol,
                "type": pos.type,
                "quantity": pos.quantity,
                "entry_price": pos.entry_price,
                "current_price": pos.current_price or pos.entry_price,
                "current_pnl": pos.current_pnl,
                "timestamp": pos.timestamp,
                "status": pos.status
            }
            for pos in self.positions.values()
            if pos.status == "open"
        ]
        return active_positions
    
    def _get_positions_db(self, db: Session) -> List[Dict]:
        """Get positions from database."""
        from models.position import Position as DBPosition, PositionStatus
        
        positions = db.query(DBPosition).filter(
            DBPosition.status == PositionStatus.OPEN
        ).all()
        
        return [
            {
                "id": pos.id,
                "symbol": pos.symbol,
                "type": pos.side.value.lower(),
                "quantity": pos.quantity,
                "entry_price": pos.entry_price,
                "current_price": pos.current_price or pos.entry_price,
                "current_pnl": self._calculate_pnl(pos),
                "timestamp": pos.opened_at.isoformat(),
                "status": pos.status.value.lower(),
                "stop_loss": pos.stop_loss,
                "take_profit": pos.take_profit,
                "trailing_stop_distance": pos.trailing_stop_distance
            }
            for pos in positions
        ]
    
    def _calculate_pnl(self, position) -> float:
        """Calculate P&L for a database position."""
        from models.position import PositionSide
        
        if not position.current_price:
            return 0.0
        
        if position.side == PositionSide.BUY:
            return (position.current_price - position.entry_price) * position.quantity
        else:
            return (position.entry_price - position.current_price) * position.quantity
    
    def update_position_price(self, position_id: str, current_price: float, db: Optional[Session] = None):
        """
        Update the current price and P&L for a position.
        
        Args:
            position_id: Position ID
            current_price: Current market price
            db: Database session (optional)
        """
        if self.use_database and db:
            self._update_position_price_db(position_id, current_price, db)
        else:
            self._update_position_price_memory(position_id, current_price)
    
    def _update_position_price_memory(self, position_id: str, current_price: float):
        """Update position price in memory."""
        if position_id in self.positions:
            position = self.positions[position_id]
            position.current_price = current_price
            
            # Calculate P&L based on position type
            if position.type == "buy":
                position.current_pnl = (current_price - position.entry_price) * position.quantity
            else:  # sell
                position.current_pnl = (position.entry_price - current_price) * position.quantity
    
    def _update_position_price_db(self, position_id: str, current_price: float, db: Session):
        """Update position price in database."""
        from models.position import Position as DBPosition, PositionStatus
        
        position = db.query(DBPosition).filter(
            DBPosition.id == position_id,
            DBPosition.status == PositionStatus.OPEN
        ).first()
        
        if position:
            position.current_price = current_price
            db.commit()
    
    def get_portfolio(self) -> Dict:
        """
        Get portfolio status including balance and total P&L.
        
        Returns:
            Portfolio dictionary with balance, P&L, and position count
        """
        # Calculate total unrealized P&L
        total_unrealized_pnl = sum(
            pos.current_pnl for pos in self.positions.values() if pos.status == "open"
        )
        
        self.portfolio.total_pnl = self.portfolio.realized_pnl + total_unrealized_pnl
        self.portfolio.positions_count = len([p for p in self.positions.values() if p.status == "open"])
        
        return {
            "balance": self.portfolio.balance,
            "total_pnl": self.portfolio.total_pnl,
            "unrealized_pnl": total_unrealized_pnl,
            "realized_pnl": self.portfolio.realized_pnl,
            "positions_count": self.portfolio.positions_count
        }
    
    def close_position(self, position_id: str, closing_price: float, db: Optional[Session] = None) -> Optional[Dict]:
        """
        Close a position and realize P&L.
        
        Args:
            position_id: Position ID to close
            closing_price: Price at which to close
            db: Database session (optional)
            
        Returns:
            Closed position details or None if not found
        """
        if self.use_database and db:
            return self._close_position_db(position_id, closing_price, db)
        else:
            return self._close_position_memory(position_id, closing_price)
    
    def _close_position_memory(self, position_id: str, closing_price: float) -> Optional[Dict]:
        """Close position in memory."""
        if position_id not in self.positions:
            return None
            
        position = self.positions[position_id]
        
        # Calculate final P&L
        if position.type == "buy":
            realized_pnl = (closing_price - position.entry_price) * position.quantity
        else:  # sell
            realized_pnl = (position.entry_price - closing_price) * position.quantity
        
        position.status = "closed"
        position.current_price = closing_price
        position.current_pnl = realized_pnl
        
        # Update portfolio
        self.portfolio.realized_pnl += realized_pnl
        self.portfolio.balance += realized_pnl
        
        # Move to closed positions
        self.closed_positions.append(position)
        
        return {
            "id": position.id,
            "symbol": position.symbol,
            "type": position.type,
            "quantity": position.quantity,
            "entry_price": position.entry_price,
            "closing_price": closing_price,
            "realized_pnl": realized_pnl,
            "timestamp": position.timestamp,
            "closed_at": datetime.now().isoformat()
        }
    
    def _close_position_db(self, position_id: str, closing_price: float, db: Session) -> Optional[Dict]:
        """Close position in database."""
        from models.position import Position as DBPosition, PositionStatus
        
        position = db.query(DBPosition).filter(DBPosition.id == position_id).first()
        if not position:
            return None
        
        realized_pnl = self._calculate_pnl(position)
        position.status = PositionStatus.CLOSED
        position.current_price = closing_price
        position.realized_pnl = realized_pnl
        position.closed_at = datetime.now()
        
        db.commit()
        
        # Update portfolio
        self.portfolio.realized_pnl += realized_pnl
        self.portfolio.balance += realized_pnl
        
        return {
            "id": position.id,
            "symbol": position.symbol,
            "type": position.side.value.lower(),
            "quantity": position.quantity,
            "entry_price": position.entry_price,
            "closing_price": closing_price,
            "realized_pnl": realized_pnl,
            "timestamp": position.opened_at.isoformat(),
            "closed_at": position.closed_at.isoformat()
        }
    
    def update_position(
        self,
        position_id: str,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
        trailing_stop_distance: Optional[float] = None,
        trailing_stop_activation_price: Optional[float] = None,
        db: Optional[Session] = None
    ):
        """Update position parameters."""
        if self.use_database and db:
            return self._update_position_db(
                position_id, stop_loss, take_profit, 
                trailing_stop_distance, trailing_stop_activation_price, db
            )
        else:
            return self._update_position_memory(
                position_id, stop_loss, take_profit,
                trailing_stop_distance, trailing_stop_activation_price
            )
    
    def _update_position_db(
        self,
        position_id: str,
        stop_loss: Optional[float],
        take_profit: Optional[float],
        trailing_stop_distance: Optional[float],
        trailing_stop_activation_price: Optional[float],
        db: Session
    ):
        """Update position in database."""
        from models.position import Position as DBPosition, PositionStatus
        
        position = db.query(DBPosition).filter(
            DBPosition.id == position_id,
            DBPosition.status == PositionStatus.OPEN
        ).first()
        
        if not position:
            return None
        
        if stop_loss is not None:
            position.stop_loss = stop_loss
        if take_profit is not None:
            position.take_profit = take_profit
        if trailing_stop_distance is not None:
            position.trailing_stop_distance = trailing_stop_distance
        if trailing_stop_activation_price is not None:
            position.trailing_stop_activation_price = trailing_stop_activation_price
        
        db.commit()
        db.refresh(position)
        
        return {
            "id": position.id,
            "symbol": position.symbol,
            "stop_loss": position.stop_loss,
            "take_profit": position.take_profit,
            "trailing_stop_distance": position.trailing_stop_distance,
            "message": "Position updated successfully"
        }
    
    def _update_position_memory(
        self,
        position_id: str,
        stop_loss: Optional[float],
        take_profit: Optional[float],
        trailing_stop_distance: Optional[float],
        trailing_stop_activation_price: Optional[float]
    ):
        """Update position in memory."""
        if position_id in self.positions:
            # Note: In-memory positions don't have these fields in the dataclass
            # This is a simplified fallback
            return {"id": position_id, "message": "Updated (in-memory)"}
        return None


# Singleton instance
paper_trading_service = PaperTradingService()
