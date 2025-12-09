"""
Tests for order monitoring service
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.advanced_orders_service import advanced_orders_service, OrderStatus
from services.order_monitoring_service import order_monitoring_service


def test_oco_order_monitoring():
    """Test OCO order monitoring and execution."""
    # Clear existing orders
    advanced_orders_service.oco_orders.clear()
    
    # Create OCO order with buy-stop above and sell-limit below
    order = advanced_orders_service.create_oco_order(
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.1,
        order1={
            "order_type": "STOP_MARKET",
            "stop_price": 51000.0  # Buy if price goes up to 51k
        },
        order2={
            "order_type": "LIMIT",
            "price": 49000.0  # Or buy if price drops to 49k
        }
    )
    
    # Simulate price going up to trigger stop order
    order_monitoring_service.update_market_price("BTCUSDT", 51500.0)
    
    # Verify order1 (stop) was triggered and order2 was cancelled
    assert order.status == OrderStatus.FILLED
    assert order.order1.status == OrderStatus.FILLED
    assert order.order2.status == OrderStatus.CANCELLED
    assert order.filled_leg == 1
    print("✓ OCO monitoring test passed")


def test_bracket_order_monitoring():
    """Test Bracket order monitoring and coordination."""
    # Clear existing orders
    advanced_orders_service.bracket_orders.clear()
    
    # Create bracket order with market entry
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
    
    # Entry should fill immediately on market order
    order_monitoring_service.update_market_price("ETHUSDT", 3000.0)
    assert order.entry_filled is True
    assert order.entry_order.status == OrderStatus.FILLED
    
    # Simulate price hitting take profit
    order_monitoring_service.update_market_price("ETHUSDT", 3250.0)
    
    # Verify take profit executed and stop loss cancelled
    assert order.exit_filled is True
    assert order.take_profit_order.status == OrderStatus.FILLED
    assert order.stop_loss_order.status == OrderStatus.CANCELLED
    assert order.status == OrderStatus.FILLED
    print("✓ Bracket monitoring test passed")


def test_trailing_stop_activation():
    """Test trailing stop activation and price updates."""
    # Clear existing orders
    advanced_orders_service.trailing_stop_orders.clear()
    
    # Create trailing stop with activation price
    order = advanced_orders_service.create_trailing_stop_order(
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.5,
        trail_percent=2.0,
        activation_price=52000.0,
        current_price=50000.0
    )
    
    # Should not be activated yet
    assert order.is_activated is False
    
    # Update price below activation - should not activate
    order_monitoring_service.update_market_price("BTCUSDT", 51000.0)
    assert order.is_activated is False
    
    # Update price above activation - should activate
    order_monitoring_service.update_market_price("BTCUSDT", 52500.0)
    assert order.is_activated is True
    assert order.peak_price == 52500.0
    
    # Stop price should be 2% below peak
    expected_stop = 52500.0 * 0.98  # 51450
    assert abs(order.current_stop_price - expected_stop) < 1.0
    print("✓ Trailing stop activation test passed")


def test_iceberg_slice_execution():
    """Test iceberg order slice execution."""
    # Clear existing orders
    advanced_orders_service.iceberg_orders.clear()
    
    # Create iceberg order
    order = advanced_orders_service.create_iceberg_order(
        symbol="BTCUSDT",
        side="BUY",
        total_quantity=5.0,
        display_quantity=1.0,
        randomize_slices=False,
        time_interval=1000
    )
    
    # Initially no slices executed
    assert order.current_slice == 0
    assert order.executed_quantity == 0.0
    
    # Execute first slice
    order_monitoring_service.update_market_price("BTCUSDT", 50000.0)
    assert order.current_slice == 1
    assert order.executed_quantity == 1.0
    # After first slice, status should be PARTIALLY_FILLED
    assert order.status == OrderStatus.PARTIALLY_FILLED
    
    # Note: In a real system, slices would execute over time intervals
    # For this test, we verify that the slice execution mechanism works
    # Each call to update_market_price executes one more slice
    print("✓ Iceberg slice execution test passed")


if __name__ == "__main__":
    print("Testing OCO order monitoring...")
    test_oco_order_monitoring()
    
    print("Testing Bracket order monitoring...")
    test_bracket_order_monitoring()
    
    print("Testing Trailing stop activation...")
    test_trailing_stop_activation()
    
    print("Testing Iceberg slice execution...")
    test_iceberg_slice_execution()
    
    print("\n✅ All monitoring tests passed!")
