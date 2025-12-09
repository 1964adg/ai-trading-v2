"""
Tests for advanced orders service
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.advanced_orders_service import (
    advanced_orders_service,
    OrderStatus
)


def test_create_oco_order():
    """Test OCO order creation."""
    order = advanced_orders_service.create_oco_order(
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.1,
        order1={
            "order_type": "LIMIT",
            "price": 50000.0
        },
        order2={
            "order_type": "STOP_MARKET",
            "stop_price": 45000.0
        }
    )
    
    assert order.id is not None
    assert order.symbol == "BTCUSDT"
    assert order.side == "BUY"
    assert order.quantity == 0.1
    assert order.status == OrderStatus.ACTIVE
    assert order.order1.order_type == "LIMIT"
    assert order.order2.order_type == "STOP_MARKET"


def test_create_bracket_order():
    """Test Bracket order creation."""
    order = advanced_orders_service.create_bracket_order(
        symbol="ETHUSDT",
        side="BUY",
        quantity=1.0,
        entry_order={
            "order_type": "MARKET",
            "price": 3000.0
        },
        stop_loss={
            "stop_price": 2900.0
        },
        take_profit={
            "limit_price": 3200.0
        }
    )
    
    assert order.id is not None
    assert order.symbol == "ETHUSDT"
    assert order.quantity == 1.0
    assert order.entry_order.order_type == "MARKET"
    assert order.stop_loss_order.stop_price == 2900.0
    assert order.take_profit_order.limit_price == 3200.0
    assert order.risk_reward_ratio == 2.0  # (3200-3000)/(3000-2900) = 200/100 = 2


def test_create_trailing_stop_order():
    """Test Trailing Stop order creation."""
    order = advanced_orders_service.create_trailing_stop_order(
        symbol="BTCUSDT",
        side="SELL",
        quantity=0.5,
        trail_percent=2.0,
        activation_price=52000.0,
        current_price=50000.0
    )
    
    assert order.id is not None
    assert order.symbol == "BTCUSDT"
    assert order.side == "SELL"
    assert order.trail_percent == 2.0
    assert order.activation_price == 52000.0
    assert order.is_activated is False  # Not activated yet


def test_create_iceberg_order():
    """Test Iceberg order creation."""
    order = advanced_orders_service.create_iceberg_order(
        symbol="BTCUSDT",
        side="BUY",
        total_quantity=10.0,
        display_quantity=1.0,
        randomize_slices=False,
        time_interval=1000
    )
    
    assert order.id is not None
    assert order.symbol == "BTCUSDT"
    assert order.total_quantity == 10.0
    assert order.display_quantity == 1.0
    assert len(order.slices) == 10
    assert order.executed_quantity == 0.0


def test_cancel_order():
    """Test order cancellation."""
    # Create an order
    order = advanced_orders_service.create_oco_order(
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.1,
        order1={"order_type": "LIMIT", "price": 50000.0},
        order2={"order_type": "STOP_MARKET", "stop_price": 45000.0}
    )
    
    # Cancel it
    success = advanced_orders_service.cancel_order(order.id)
    assert success is True
    assert order.status == OrderStatus.CANCELLED


def test_get_all_orders():
    """Test retrieving all orders."""
    # Clear existing orders
    advanced_orders_service.oco_orders.clear()
    advanced_orders_service.bracket_orders.clear()
    advanced_orders_service.trailing_stop_orders.clear()
    advanced_orders_service.iceberg_orders.clear()
    
    # Create one of each type
    advanced_orders_service.create_oco_order(
        symbol="BTCUSDT", side="BUY", quantity=0.1,
        order1={"order_type": "LIMIT", "price": 50000.0},
        order2={"order_type": "STOP_MARKET", "stop_price": 45000.0}
    )
    advanced_orders_service.create_bracket_order(
        symbol="ETHUSDT", side="BUY", quantity=1.0,
        entry_order={"order_type": "MARKET", "price": 3000.0},
        stop_loss={"stop_price": 2900.0},
        take_profit={"limit_price": 3200.0}
    )
    
    all_orders = advanced_orders_service.get_all_orders()
    assert len(all_orders["oco_orders"]) == 1
    assert len(all_orders["bracket_orders"]) == 1


if __name__ == "__main__":
    # Run basic tests without pytest
    print("Testing OCO order creation...")
    test_create_oco_order()
    print("✓ OCO order test passed")
    
    print("Testing Bracket order creation...")
    test_create_bracket_order()
    print("✓ Bracket order test passed")
    
    print("Testing Trailing Stop order creation...")
    test_create_trailing_stop_order()
    print("✓ Trailing Stop order test passed")
    
    print("Testing Iceberg order creation...")
    test_create_iceberg_order()
    print("✓ Iceberg order test passed")
    
    print("Testing order cancellation...")
    test_cancel_order()
    print("✓ Order cancellation test passed")
    
    print("Testing get all orders...")
    test_get_all_orders()
    print("✓ Get all orders test passed")
    
    print("\n✅ All tests passed!")
