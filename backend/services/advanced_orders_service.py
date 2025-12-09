# -*- coding: utf-8 -*-
"""Advanced orders service for managing OCO, Bracket, Trailing Stop, and Iceberg orders."""

from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import uuid


class OrderType(str, Enum):
    """Advanced order types."""
    OCO = "OCO"
    BRACKET = "BRACKET"
    TRAILING_STOP = "TRAILING_STOP"
    ICEBERG = "ICEBERG"


class OrderStatus(str, Enum):
    """Order status."""
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


@dataclass
class OCOLeg:
    """Represents one leg of an OCO order."""
    id: str
    order_type: str  # "LIMIT", "STOP_MARKET", "STOP_LIMIT"
    price: Optional[float] = None
    stop_price: Optional[float] = None
    limit_price: Optional[float] = None
    status: str = OrderStatus.PENDING
    order_id: Optional[str] = None
    executed_at: Optional[str] = None


@dataclass
class OCOOrder:
    """OCO (One-Cancels-Other) order."""
    id: str
    symbol: str
    side: str  # "BUY" or "SELL"
    quantity: float
    order1: OCOLeg
    order2: OCOLeg
    status: str = OrderStatus.PENDING
    filled_leg: Optional[int] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class BracketLeg:
    """Represents one leg of a bracket order."""
    id: str
    order_type: str  # "MARKET", "LIMIT", "STOP_MARKET", "STOP_LIMIT"
    quantity: float
    price: Optional[float] = None
    stop_price: Optional[float] = None
    limit_price: Optional[float] = None
    status: str = OrderStatus.PENDING
    order_id: Optional[str] = None
    executed_at: Optional[str] = None


@dataclass
class BracketOrder:
    """Bracket order with entry, stop loss, and take profit."""
    id: str
    symbol: str
    side: str  # "BUY" or "SELL"
    quantity: float
    entry_order: BracketLeg
    stop_loss_order: BracketLeg
    take_profit_order: BracketLeg
    risk_reward_ratio: float
    entry_filled: bool = False
    exit_filled: bool = False
    status: str = OrderStatus.PENDING
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class TrailingStopOrder:
    """Advanced trailing stop order."""
    id: str
    symbol: str
    side: str  # "BUY" or "SELL"
    quantity: float
    trail_amount: Optional[float] = None
    trail_percent: Optional[float] = None
    activation_price: Optional[float] = None
    current_stop_price: float = 0.0
    peak_price: float = 0.0
    is_activated: bool = False
    status: str = OrderStatus.PENDING
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class IcebergSlice:
    """Represents one slice of an iceberg order."""
    id: str
    quantity: float
    status: str = OrderStatus.PENDING
    order_id: Optional[str] = None
    executed_at: Optional[str] = None


@dataclass
class IcebergOrder:
    """Iceberg order for hidden quantity execution."""
    id: str
    symbol: str
    side: str  # "BUY" or "SELL"
    total_quantity: float
    display_quantity: float
    executed_quantity: float = 0.0
    randomize_slices: bool = False
    time_interval: int = 1000  # milliseconds
    current_slice: int = 0
    slices: List[IcebergSlice] = field(default_factory=list)
    status: str = OrderStatus.PENDING
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())


class AdvancedOrdersService:
    """Service for managing advanced order types."""
    
    def __init__(self):
        self.oco_orders: Dict[str, OCOOrder] = {}
        self.bracket_orders: Dict[str, BracketOrder] = {}
        self.trailing_stop_orders: Dict[str, TrailingStopOrder] = {}
        self.iceberg_orders: Dict[str, IcebergOrder] = {}
    
    def create_oco_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        order1: Dict[str, Any],
        order2: Dict[str, Any]
    ) -> OCOOrder:
        """Create an OCO order."""
        order_id = str(uuid.uuid4())
        
        leg1 = OCOLeg(
            id=f"{order_id}_leg1",
            order_type=order1["order_type"],
            price=order1.get("price"),
            stop_price=order1.get("stop_price"),
            limit_price=order1.get("limit_price")
        )
        
        leg2 = OCOLeg(
            id=f"{order_id}_leg2",
            order_type=order2["order_type"],
            price=order2.get("price"),
            stop_price=order2.get("stop_price"),
            limit_price=order2.get("limit_price")
        )
        
        oco_order = OCOOrder(
            id=order_id,
            symbol=symbol.upper(),
            side=side.upper(),
            quantity=quantity,
            order1=leg1,
            order2=leg2,
            status=OrderStatus.ACTIVE
        )
        
        self.oco_orders[order_id] = oco_order
        return oco_order
    
    def create_bracket_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        entry_order: Dict[str, Any],
        stop_loss: Dict[str, Any],
        take_profit: Dict[str, Any]
    ) -> BracketOrder:
        """Create a bracket order."""
        order_id = str(uuid.uuid4())
        
        entry = BracketLeg(
            id=f"{order_id}_entry",
            order_type=entry_order["order_type"],
            quantity=quantity,
            price=entry_order.get("price")
        )
        
        stop = BracketLeg(
            id=f"{order_id}_stop",
            order_type="STOP_MARKET",
            quantity=quantity,
            stop_price=stop_loss["stop_price"]
        )
        
        profit = BracketLeg(
            id=f"{order_id}_profit",
            order_type="LIMIT",
            quantity=quantity,
            limit_price=take_profit["limit_price"]
        )
        
        # Calculate risk/reward ratio
        entry_price = entry_order.get("price", 0)
        risk = abs(entry_price - stop_loss["stop_price"])
        reward = abs(take_profit["limit_price"] - entry_price)
        risk_reward_ratio = reward / risk if risk > 0 else 0
        
        bracket_order = BracketOrder(
            id=order_id,
            symbol=symbol.upper(),
            side=side.upper(),
            quantity=quantity,
            entry_order=entry,
            stop_loss_order=stop,
            take_profit_order=profit,
            risk_reward_ratio=risk_reward_ratio,
            status=OrderStatus.ACTIVE
        )
        
        self.bracket_orders[order_id] = bracket_order
        return bracket_order
    
    def create_trailing_stop_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        trail_amount: Optional[float] = None,
        trail_percent: Optional[float] = None,
        activation_price: Optional[float] = None,
        current_price: float = 0.0
    ) -> TrailingStopOrder:
        """Create a trailing stop order."""
        order_id = str(uuid.uuid4())
        
        trailing_order = TrailingStopOrder(
            id=order_id,
            symbol=symbol.upper(),
            side=side.upper(),
            quantity=quantity,
            trail_amount=trail_amount,
            trail_percent=trail_percent,
            activation_price=activation_price,
            peak_price=current_price,
            current_stop_price=current_price,
            is_activated=activation_price is None,  # Active immediately if no activation price
            status=OrderStatus.ACTIVE
        )
        
        self.trailing_stop_orders[order_id] = trailing_order
        return trailing_order
    
    def create_iceberg_order(
        self,
        symbol: str,
        side: str,
        total_quantity: float,
        display_quantity: float,
        randomize_slices: bool = False,
        time_interval: int = 1000
    ) -> IcebergOrder:
        """Create an iceberg order."""
        order_id = str(uuid.uuid4())
        
        # Calculate slices
        num_slices = int(total_quantity / display_quantity)
        remaining = total_quantity % display_quantity
        
        slices = []
        for i in range(num_slices):
            slices.append(IcebergSlice(
                id=f"{order_id}_slice_{i}",
                quantity=display_quantity
            ))
        
        if remaining > 0:
            slices.append(IcebergSlice(
                id=f"{order_id}_slice_{num_slices}",
                quantity=remaining
            ))
        
        iceberg_order = IcebergOrder(
            id=order_id,
            symbol=symbol.upper(),
            side=side.upper(),
            total_quantity=total_quantity,
            display_quantity=display_quantity,
            randomize_slices=randomize_slices,
            time_interval=time_interval,
            slices=slices,
            status=OrderStatus.ACTIVE
        )
        
        self.iceberg_orders[order_id] = iceberg_order
        return iceberg_order
    
    def get_all_orders(self) -> Dict[str, List[Dict]]:
        """Get all advanced orders."""
        return {
            "oco_orders": [self._oco_to_dict(o) for o in self.oco_orders.values()],
            "bracket_orders": [self._bracket_to_dict(o) for o in self.bracket_orders.values()],
            "trailing_stop_orders": [self._trailing_stop_to_dict(o) for o in self.trailing_stop_orders.values()],
            "iceberg_orders": [self._iceberg_to_dict(o) for o in self.iceberg_orders.values()]
        }
    
    def cancel_order(self, order_id: str) -> bool:
        """Cancel an advanced order."""
        if order_id in self.oco_orders:
            self.oco_orders[order_id].status = OrderStatus.CANCELLED
            return True
        elif order_id in self.bracket_orders:
            self.bracket_orders[order_id].status = OrderStatus.CANCELLED
            return True
        elif order_id in self.trailing_stop_orders:
            self.trailing_stop_orders[order_id].status = OrderStatus.CANCELLED
            return True
        elif order_id in self.iceberg_orders:
            self.iceberg_orders[order_id].status = OrderStatus.CANCELLED
            return True
        return False
    
    def _oco_to_dict(self, order: OCOOrder) -> Dict:
        """Convert OCO order to dictionary."""
        return {
            "id": order.id,
            "type": "OCO",
            "symbol": order.symbol,
            "side": order.side,
            "quantity": order.quantity,
            "order1": {
                "id": order.order1.id,
                "order_type": order.order1.order_type,
                "price": order.order1.price,
                "stop_price": order.order1.stop_price,
                "limit_price": order.order1.limit_price,
                "status": order.order1.status
            },
            "order2": {
                "id": order.order2.id,
                "order_type": order.order2.order_type,
                "price": order.order2.price,
                "stop_price": order.order2.stop_price,
                "limit_price": order.order2.limit_price,
                "status": order.order2.status
            },
            "status": order.status,
            "filled_leg": order.filled_leg,
            "created_at": order.created_at,
            "updated_at": order.updated_at
        }
    
    def _bracket_to_dict(self, order: BracketOrder) -> Dict:
        """Convert bracket order to dictionary."""
        return {
            "id": order.id,
            "type": "BRACKET",
            "symbol": order.symbol,
            "side": order.side,
            "quantity": order.quantity,
            "entry_order": {
                "id": order.entry_order.id,
                "order_type": order.entry_order.order_type,
                "price": order.entry_order.price,
                "status": order.entry_order.status
            },
            "stop_loss_order": {
                "id": order.stop_loss_order.id,
                "stop_price": order.stop_loss_order.stop_price,
                "status": order.stop_loss_order.status
            },
            "take_profit_order": {
                "id": order.take_profit_order.id,
                "limit_price": order.take_profit_order.limit_price,
                "status": order.take_profit_order.status
            },
            "risk_reward_ratio": order.risk_reward_ratio,
            "entry_filled": order.entry_filled,
            "exit_filled": order.exit_filled,
            "status": order.status,
            "created_at": order.created_at,
            "updated_at": order.updated_at
        }
    
    def _trailing_stop_to_dict(self, order: TrailingStopOrder) -> Dict:
        """Convert trailing stop order to dictionary."""
        return {
            "id": order.id,
            "type": "TRAILING_STOP",
            "symbol": order.symbol,
            "side": order.side,
            "quantity": order.quantity,
            "trail_amount": order.trail_amount,
            "trail_percent": order.trail_percent,
            "activation_price": order.activation_price,
            "current_stop_price": order.current_stop_price,
            "peak_price": order.peak_price,
            "is_activated": order.is_activated,
            "status": order.status,
            "created_at": order.created_at,
            "updated_at": order.updated_at
        }
    
    def _iceberg_to_dict(self, order: IcebergOrder) -> Dict:
        """Convert iceberg order to dictionary."""
        return {
            "id": order.id,
            "type": "ICEBERG",
            "symbol": order.symbol,
            "side": order.side,
            "total_quantity": order.total_quantity,
            "display_quantity": order.display_quantity,
            "executed_quantity": order.executed_quantity,
            "current_slice": order.current_slice,
            "total_slices": len(order.slices),
            "status": order.status,
            "created_at": order.created_at,
            "updated_at": order.updated_at
        }


# Singleton instance
advanced_orders_service = AdvancedOrdersService()
