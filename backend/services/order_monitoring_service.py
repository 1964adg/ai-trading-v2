# -*- coding: utf-8 -*-
"""Order monitoring service for tracking and triggering advanced orders."""

from datetime import datetime
from typing import Dict, Optional
import asyncio
from services.advanced_orders_service import (
    advanced_orders_service,
    OrderStatus,
    OCOOrder,
    BracketOrder,
    TrailingStopOrder,
    IcebergOrder
)


class OrderMonitoringService:
    """Service for monitoring and executing advanced orders based on market conditions."""
    
    def __init__(self):
        self.monitored_prices: Dict[str, float] = {}
        self._websocket_manager = None  # Will be set later to avoid circular import
    
    def set_websocket_manager(self, manager):
        """Set the websocket manager for broadcasting updates."""
        self._websocket_manager = manager
    
    async def _broadcast_order_update(self, order_type: str, order_data: dict):
        """Broadcast order update via WebSocket if available."""
        if self._websocket_manager:
            try:
                await self._websocket_manager.broadcast_to_all({
                    "type": "ORDER_UPDATE",
                    "orderType": order_type,
                    "order": order_data,
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })
            except Exception as e:
                print(f"[Order Monitoring] Error broadcasting update: {e}")
    
    def _schedule_broadcast(self, order_type: str, order_data: dict):
        """Schedule a broadcast without blocking. Used for synchronous contexts."""
        if self._websocket_manager:
            task = asyncio.create_task(self._broadcast_order_update(order_type, order_data))
            # Add exception handler to prevent silent failures
            task.add_done_callback(lambda t: None if t.exception() is None else 
                                   print(f"[Order Monitoring] Broadcast failed: {t.exception()}"))
    
    def update_market_price(self, symbol: str, price: float):
        """Update market price for a symbol."""
        self.monitored_prices[symbol] = price
        
        # Monitor all order types for this symbol
        self._monitor_oco_orders(symbol, price)
        self._monitor_bracket_orders(symbol, price)
        self._monitor_trailing_stops(symbol, price)
        self._monitor_iceberg_orders(symbol, price)
    
    def _monitor_oco_orders(self, symbol: str, current_price: float):
        """Monitor OCO orders and trigger/cancel as needed."""
        for order in advanced_orders_service.oco_orders.values():
            if order.symbol != symbol or order.status != OrderStatus.ACTIVE:
                continue
            
            # Check if either leg should trigger
            leg1_triggered = self._check_leg_trigger(order.order1, current_price, order.side)
            leg2_triggered = self._check_leg_trigger(order.order2, current_price, order.side)
            
            if leg1_triggered:
                order.order1.status = OrderStatus.FILLED
                order.order1.executed_at = datetime.now().isoformat()
                order.order2.status = OrderStatus.CANCELLED
                order.filled_leg = 1
                order.status = OrderStatus.FILLED
                order.updated_at = datetime.now().isoformat()
                
                # Broadcast update
                self._schedule_broadcast("OCO", {
                    "id": order.id,
                    "symbol": order.symbol,
                    "status": order.status,
                    "filled_leg": order.filled_leg
                })
                    
            elif leg2_triggered:
                order.order2.status = OrderStatus.FILLED
                order.order2.executed_at = datetime.now().isoformat()
                order.order1.status = OrderStatus.CANCELLED
                order.filled_leg = 2
                order.status = OrderStatus.FILLED
                order.updated_at = datetime.now().isoformat()
                
                # Broadcast update
                self._schedule_broadcast("OCO", {
                    "id": order.id,
                    "symbol": order.symbol,
                    "status": order.status,
                    "filled_leg": order.filled_leg
                })
    
    def _monitor_bracket_orders(self, symbol: str, current_price: float):
        """Monitor bracket orders and manage entry/exit coordination."""
        for order in advanced_orders_service.bracket_orders.values():
            if order.symbol != symbol or order.status == OrderStatus.CANCELLED:
                continue
            
            # If entry not filled, check entry trigger
            if not order.entry_filled:
                entry_triggered = self._check_entry_trigger(order.entry_order, current_price, order.side)
                if entry_triggered:
                    order.entry_filled = True
                    order.entry_order.status = OrderStatus.FILLED
                    order.entry_order.executed_at = datetime.now().isoformat()
                    # Activate stop loss and take profit
                    order.stop_loss_order.status = OrderStatus.ACTIVE
                    order.take_profit_order.status = OrderStatus.ACTIVE
                    order.status = OrderStatus.ACTIVE
                    order.updated_at = datetime.now().isoformat()
                    
                    # Broadcast update
                    self._schedule_broadcast("BRACKET", {
                        "id": order.id,
                        "symbol": order.symbol,
                        "status": order.status,
                        "entry_filled": order.entry_filled
                    })
            
            # If entry filled, check exit triggers
            elif order.entry_filled and not order.exit_filled:
                # Check stop loss
                stop_triggered = self._check_stop_trigger(order.stop_loss_order, current_price, order.side)
                if stop_triggered:
                    order.exit_filled = True
                    order.stop_loss_order.status = OrderStatus.FILLED
                    order.stop_loss_order.executed_at = datetime.now().isoformat()
                    order.take_profit_order.status = OrderStatus.CANCELLED
                    order.status = OrderStatus.FILLED
                    order.updated_at = datetime.now().isoformat()
                    
                    # Broadcast update
                    self._schedule_broadcast("BRACKET", {
                        "id": order.id,
                        "symbol": order.symbol,
                        "status": order.status,
                        "exit_type": "stop_loss"
                    })
                    continue
                
                # Check take profit
                profit_triggered = self._check_profit_trigger(order.take_profit_order, current_price, order.side)
                if profit_triggered:
                    order.exit_filled = True
                    order.take_profit_order.status = OrderStatus.FILLED
                    order.take_profit_order.executed_at = datetime.now().isoformat()
                    order.stop_loss_order.status = OrderStatus.CANCELLED
                    order.status = OrderStatus.FILLED
                    order.updated_at = datetime.now().isoformat()
                    
                    # Broadcast update
                    self._schedule_broadcast("BRACKET", {
                        "id": order.id,
                        "symbol": order.symbol,
                        "status": order.status,
                        "exit_type": "take_profit"
                    })
    
    def _monitor_trailing_stops(self, symbol: str, current_price: float):
        """Monitor and update trailing stop orders."""
        for order in advanced_orders_service.trailing_stop_orders.values():
            if order.symbol != symbol or order.status != OrderStatus.ACTIVE:
                continue
            
            old_stop_price = order.current_stop_price
            
            # Check activation
            if not order.is_activated and order.activation_price:
                if order.side == "BUY":
                    if current_price >= order.activation_price:
                        order.is_activated = True
                        order.peak_price = current_price
                        # Set initial stop price on activation
                        if order.trail_percent:
                            order.current_stop_price = current_price * (1 - order.trail_percent / 100)
                        elif order.trail_amount:
                            order.current_stop_price = current_price - order.trail_amount
                else:  # SELL
                    if current_price <= order.activation_price:
                        order.is_activated = True
                        order.peak_price = current_price
                        # Set initial stop price on activation
                        if order.trail_percent:
                            order.current_stop_price = current_price * (1 + order.trail_percent / 100)
                        elif order.trail_amount:
                            order.current_stop_price = current_price + order.trail_amount
            
            # Update trailing stop if activated
            if order.is_activated:
                # Update peak price
                if order.side == "BUY":
                    if current_price > order.peak_price:
                        order.peak_price = current_price
                        # Update stop price
                        if order.trail_percent:
                            order.current_stop_price = current_price * (1 - order.trail_percent / 100)
                        elif order.trail_amount:
                            order.current_stop_price = current_price - order.trail_amount
                else:  # SELL
                    if current_price < order.peak_price:
                        order.peak_price = current_price
                        # Update stop price
                        if order.trail_percent:
                            order.current_stop_price = current_price * (1 + order.trail_percent / 100)
                        elif order.trail_amount:
                            order.current_stop_price = current_price + order.trail_amount
                
                # Broadcast if stop price changed
                if old_stop_price != order.current_stop_price:
                    self._schedule_broadcast("TRAILING_STOP", {
                        "id": order.id,
                        "symbol": order.symbol,
                        "current_stop_price": order.current_stop_price,
                        "peak_price": order.peak_price
                    })
                
                # Check if stop triggered
                stop_triggered = False
                if order.side == "BUY":
                    stop_triggered = current_price <= order.current_stop_price
                else:  # SELL
                    stop_triggered = current_price >= order.current_stop_price
                
                if stop_triggered:
                    order.status = OrderStatus.FILLED
                    order.updated_at = datetime.now().isoformat()
                    
                    # Broadcast trigger
                    self._schedule_broadcast("TRAILING_STOP", {
                        "id": order.id,
                        "symbol": order.symbol,
                        "status": order.status,
                        "triggered": True
                    })
    
    def _monitor_iceberg_orders(self, symbol: str, current_price: float):
        """Monitor iceberg orders for slice execution."""
        for order in advanced_orders_service.iceberg_orders.values():
            if order.symbol != symbol or order.status != OrderStatus.ACTIVE:
                continue
            
            # Check if current slice can be executed (simplified - in real system would submit to exchange)
            if order.current_slice < len(order.slices):
                current_slice = order.slices[order.current_slice]
                if current_slice.status == OrderStatus.PENDING:
                    # Mark slice as filled (simplified execution)
                    current_slice.status = OrderStatus.FILLED
                    current_slice.executed_at = datetime.now().isoformat()
                    order.executed_quantity += current_slice.quantity
                    order.current_slice += 1
                    
                    # Check if all slices filled
                    if order.current_slice >= len(order.slices):
                        order.status = OrderStatus.FILLED
                    else:
                        order.status = OrderStatus.PARTIALLY_FILLED
                    
                    order.updated_at = datetime.now().isoformat()
    
    def _check_leg_trigger(self, leg, current_price: float, side: str) -> bool:
        """Check if an OCO leg should trigger."""
        if leg.order_type == "LIMIT":
            if side == "BUY":
                return current_price <= (leg.price or float('inf'))
            else:
                return current_price >= (leg.price or 0)
        elif leg.order_type == "STOP_MARKET":
            if side == "BUY":
                return current_price >= (leg.stop_price or float('inf'))
            else:
                return current_price <= (leg.stop_price or 0)
        elif leg.order_type == "STOP_LIMIT":
            # Check stop price first
            if side == "BUY":
                return current_price >= (leg.stop_price or float('inf'))
            else:
                return current_price <= (leg.stop_price or 0)
        return False
    
    def _check_entry_trigger(self, entry, current_price: float, side: str) -> bool:
        """Check if entry order should trigger."""
        if entry.order_type == "MARKET":
            return True
        elif entry.order_type == "LIMIT":
            if side == "BUY":
                return current_price <= (entry.price or float('inf'))
            else:
                return current_price >= (entry.price or 0)
        return False
    
    def _check_stop_trigger(self, stop_order, current_price: float, side: str) -> bool:
        """Check if stop loss should trigger."""
        if side == "BUY":
            return current_price <= (stop_order.stop_price or 0)
        else:
            return current_price >= (stop_order.stop_price or float('inf'))
    
    def _check_profit_trigger(self, profit_order, current_price: float, side: str) -> bool:
        """Check if take profit should trigger."""
        if side == "BUY":
            return current_price >= (profit_order.limit_price or float('inf'))
        else:
            return current_price <= (profit_order.limit_price or 0)


# Singleton instance
order_monitoring_service = OrderMonitoringService()
