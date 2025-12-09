# Advanced Order Types Quick Reference

## Overview

AI Trading V2 now supports 4 professional-grade advanced order types for paper trading with real market data.

## Quick Start

### Starting the Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend will be available at: `http://localhost:8000`

## Order Types Quick Reference

### 1. OCO (One-Cancels-Other)

**When to Use:** Breakout trading, range trading  
**Example:** Place buy orders above and below current price - whichever triggers first cancels the other

```bash
curl -X POST http://localhost:8000/api/paper/advanced-order/oco \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "side": "BUY",
    "quantity": 0.1,
    "order1": {"order_type": "LIMIT", "price": 50000.0},
    "order2": {"order_type": "STOP_MARKET", "stop_price": 45000.0}
  }'
```

### 2. Bracket Order

**When to Use:** Complete position management with pre-defined exit points  
**Example:** Enter position with automatic stop-loss and take-profit

```bash
curl -X POST http://localhost:8000/api/paper/advanced-order/bracket \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "ETHUSDT",
    "side": "BUY",
    "quantity": 1.0,
    "entry_order": {"order_type": "MARKET"},
    "stop_loss": {"stop_price": 2900.0},
    "take_profit": {"limit_price": 3200.0}
  }'
```

### 3. Trailing Stop

**When to Use:** Lock in profits while allowing position to run  
**Example:** Exit only if price drops 2% from peak

```bash
curl -X POST http://localhost:8000/api/paper/advanced-order/trailing-stop \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "side": "SELL",
    "quantity": 0.5,
    "trail_percent": 2.0
  }'
```

### 4. Iceberg Order

**When to Use:** Execute large orders without showing full size  
**Example:** Buy 10 BTC but only show 1 BTC at a time

```bash
curl -X POST http://localhost:8000/api/paper/advanced-order/iceberg \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "side": "BUY",
    "total_quantity": 10.0,
    "display_quantity": 1.0
  }'
```

## Common Operations

### List All Orders

```bash
curl http://localhost:8000/api/paper/advanced-orders
```

### Cancel an Order

```bash
curl -X DELETE http://localhost:8000/api/paper/advanced-order/{order_id}
```

### Trigger Price Monitoring

```bash
curl -X POST http://localhost:8000/api/paper/advanced-orders/update-prices
```

## Python Examples

### Creating Orders with Python

```python
import requests

base_url = "http://localhost:8000/api/paper"

# OCO Order
oco_response = requests.post(
    f"{base_url}/advanced-order/oco",
    json={
        "symbol": "BTCUSDT",
        "side": "BUY",
        "quantity": 0.1,
        "order1": {"order_type": "LIMIT", "price": 50000.0},
        "order2": {"order_type": "STOP_MARKET", "stop_price": 45000.0}
    }
)
print(f"OCO Order ID: {oco_response.json()['order']['id']}")

# Bracket Order
bracket_response = requests.post(
    f"{base_url}/advanced-order/bracket",
    json={
        "symbol": "ETHUSDT",
        "side": "BUY",
        "quantity": 1.0,
        "entry_order": {"order_type": "MARKET"},
        "stop_loss": {"stop_price": 2900.0},
        "take_profit": {"limit_price": 3200.0}
    }
)
print(f"Risk/Reward: {bracket_response.json()['order']['risk_reward_ratio']}")
```

## Order Status Tracking

Orders progress through these statuses:

- **PENDING**: Order created but not yet active
- **ACTIVE**: Order is monitoring market for triggers
- **PARTIALLY_FILLED**: Some (but not all) of the order executed (Iceberg only)
- **FILLED**: Order fully executed
- **CANCELLED**: Order cancelled (manually or by OCO logic)

## Best Practices

### OCO Orders
✅ Use for breakout strategies  
✅ Set reasonable price gaps  
❌ Don't place orders too close to current price

### Bracket Orders
✅ Always set stop-loss  
✅ Use realistic risk/reward ratios (1:2 or better)  
❌ Don't set take-profit too far from entry

### Trailing Stops
✅ Use activation price in choppy markets  
✅ Set trail percentage based on volatility  
❌ Don't trail too tightly (will get stopped out)

### Iceberg Orders
✅ Use for large positions  
✅ Set display quantity < 10% of total  
❌ Don't make slices too small (inefficient)

## Troubleshooting

### "Unable to fetch market price"
- Check internet connection
- Binance API might be temporarily unavailable
- Try with a different symbol

### Order not triggering
- Call `POST /advanced-orders/update-prices` to trigger monitoring
- Check order status with `GET /advanced-orders`
- Verify price conditions are met

### Order cancelled unexpectedly
- For OCO: Other leg filled (expected behavior)
- For Bracket: One exit condition met (expected behavior)
- Check order details for filled_leg or exit_filled status

## Testing

### Run Unit Tests

```bash
cd backend
python tests/test_advanced_orders.py
python tests/test_order_monitoring.py
```

Expected output: `✅ All tests passed!`

## Documentation Links

- **Full API Documentation:** [ADVANCED_ORDERS_API.md](./ADVANCED_ORDERS_API.md)
- **Implementation Summary:** [ADVANCED_ORDERS_IMPLEMENTATION_SUMMARY.md](./ADVANCED_ORDERS_IMPLEMENTATION_SUMMARY.md)

## Support

For issues or questions:
1. Check the full API documentation
2. Review the implementation summary
3. Run the test suite to verify installation
4. Check server logs for error details

## Version

**Implementation:** December 9, 2025  
**Status:** Production Ready  
**Backend Version:** 1.0.0
