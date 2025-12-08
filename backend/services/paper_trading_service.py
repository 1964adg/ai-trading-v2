# -*- coding: utf-8 -*-
"""Paper trading service for managing simulated positions and portfolio."""

from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field
import uuid


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
        self.positions: Dict[str, PaperPosition] = {}
        self.portfolio = PaperPortfolio()
        self.closed_positions: List[PaperPosition] = []
        
    def create_order(
        self,
        order_type: str,
        symbol: str,
        quantity: float,
        price: Optional[float] = None
    ) -> Dict:
        """
        Create a paper trading order.
        
        Args:
            order_type: "buy" or "sell"
            symbol: Trading pair symbol
            quantity: Order quantity
            price: Order price (optional, uses market price if not provided)
            
        Returns:
            Order response with status and details
        """
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
        # Use first 8 chars of UUID for shorter client order ID
        client_order_id = f"paper_{order_id[:8]}" if len(order_id) >= 8 else f"paper_{order_id}"
        
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
    
    def get_positions(self) -> List[Dict]:
        """
        Get all active paper trading positions.
        
        Returns:
            List of position dictionaries
        """
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
    
    def update_position_price(self, position_id: str, current_price: float):
        """
        Update the current price and P&L for a position.
        
        Args:
            position_id: Position ID
            current_price: Current market price
        """
        if position_id in self.positions:
            position = self.positions[position_id]
            position.current_price = current_price
            
            # Calculate P&L based on position type
            if position.type == "buy":
                position.current_pnl = (current_price - position.entry_price) * position.quantity
            else:  # sell
                position.current_pnl = (position.entry_price - current_price) * position.quantity
    
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
    
    def close_position(self, position_id: str, closing_price: float) -> Optional[Dict]:
        """
        Close a position and realize P&L.
        
        Args:
            position_id: Position ID to close
            closing_price: Price at which to close
            
        Returns:
            Closed position details or None if not found
        """
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


# Singleton instance
paper_trading_service = PaperTradingService()
