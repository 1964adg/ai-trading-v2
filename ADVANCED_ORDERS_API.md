# Advanced Order Types API Documentation

## Overview

The AI Trading V2 system now supports professional-grade advanced order types for paper trading, including OCO (One-Cancels-Other), Bracket Orders, Trailing Stops, and Iceberg Orders.

## Base URL

```
http://localhost:8000/api/paper
```

## Endpoints

### 1. Create OCO Order

Create a One-Cancels-Other order where execution of one order automatically cancels the other.

**Endpoint:** `POST /advanced-order/oco`

**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "quantity": 0.1,
  "order1": {
    "order_type": "LIMIT",
    "price": 50000.0
  },
  "order2": {
    "order_type": "STOP_MARKET",
    "stop_price": 45000.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "oco_1234567890_abc",
    "type": "OCO",
    "symbol": "BTCUSDT",
    "side": "BUY",
    "quantity": 0.1,
    "status": "ACTIVE",
    "order1": {
      "id": "oco_1234567890_abc_leg1",
      "order_type": "LIMIT",
      "price": 50000.0,
      "status": "PENDING"
    },
    "order2": {
      "id": "oco_1234567890_abc_leg2",
      "order_type": "STOP_MARKET",
      "stop_price": 45000.0,
      "status": "PENDING"
    },
    "created_at": "2025-12-09T21:00:00",
    "updated_at": "2025-12-09T21:00:00"
  },
  "message": "OCO order created successfully"
}
```

**Use Cases:**
- Breakout trading: Buy-stop above resistance + Sell-limit below support
- Range trading: Buy-limit at support + Sell-limit at resistance

---

### 2. Create Bracket Order

Create a complete position management order with entry, stop loss, and take profit.

**Endpoint:** `POST /advanced-order/bracket`

**Request Body:**
```json
{
  "symbol": "ETHUSDT",
  "side": "BUY",
  "quantity": 1.0,
  "entry_order": {
    "order_type": "MARKET"
  },
  "stop_loss": {
    "stop_price": 2900.0
  },
  "take_profit": {
    "limit_price": 3200.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "bracket_1234567890_abc",
    "type": "BRACKET",
    "symbol": "ETHUSDT",
    "side": "BUY",
    "quantity": 1.0,
    "entry_order": {
      "order_type": "MARKET",
      "price": 3000.0,
      "status": "PENDING"
    },
    "stop_loss_order": {
      "stop_price": 2900.0,
      "status": "PENDING"
    },
    "take_profit_order": {
      "limit_price": 3200.0,
      "status": "PENDING"
    },
    "risk_reward_ratio": 2.0,
    "entry_filled": false,
    "exit_filled": false,
    "status": "ACTIVE"
  },
  "message": "Bracket order created successfully"
}
```

**Features:**
- Automatic stop-loss placement after entry fills
- Automatic take-profit placement after entry fills
- Risk/reward ratio calculation
- Entry can be MARKET or LIMIT

---

### 3. Create Trailing Stop Order

Create an advanced trailing stop that adjusts dynamically with price movement.

**Endpoint:** `POST /advanced-order/trailing-stop`

**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "side": "SELL",
  "quantity": 0.5,
  "trail_percent": 2.0,
  "activation_price": 52000.0
}
```

**Alternate (Fixed Amount):**
```json
{
  "symbol": "BTCUSDT",
  "side": "SELL",
  "quantity": 0.5,
  "trail_amount": 1000.0
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "trailing_stop_1234567890_abc",
    "type": "TRAILING_STOP",
    "symbol": "BTCUSDT",
    "side": "SELL",
    "quantity": 0.5,
    "trail_percent": 2.0,
    "activation_price": 52000.0,
    "current_stop_price": 50000.0,
    "peak_price": 50000.0,
    "is_activated": false,
    "status": "ACTIVE"
  },
  "message": "Trailing Stop order created successfully"
}
```

**Features:**
- Percentage-based trailing (e.g., 2% below peak)
- Fixed amount trailing (e.g., $1000 below peak)
- Optional activation price (start trailing only after certain level)
- Automatic stop price adjustment as price moves favorably

---

### 4. Create Iceberg Order

Create an order that hides large quantity by executing in small slices.

**Endpoint:** `POST /advanced-order/iceberg`

**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "total_quantity": 10.0,
  "display_quantity": 1.0,
  "randomize_slices": false,
  "time_interval": 1000
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "iceberg_1234567890_abc",
    "type": "ICEBERG",
    "symbol": "BTCUSDT",
    "side": "BUY",
    "total_quantity": 10.0,
    "display_quantity": 1.0,
    "executed_quantity": 0.0,
    "current_slice": 0,
    "total_slices": 10,
    "status": "ACTIVE"
  },
  "message": "Iceberg order created successfully"
}
```

**Features:**
- Hide large orders by showing only small portions
- Configurable slice size
- Optional randomization to avoid detection
- Time-based slice execution

---

### 5. Get All Advanced Orders

Retrieve all active advanced orders.

**Endpoint:** `GET /advanced-orders`

**Response:**
```json
{
  "success": true,
  "orders": {
    "oco_orders": [...],
    "bracket_orders": [...],
    "trailing_stop_orders": [...],
    "iceberg_orders": [...]
  }
}
```

---

### 6. Cancel Advanced Order

Cancel an active advanced order.

**Endpoint:** `DELETE /advanced-order/{order_id}`

**Response:**
```json
{
  "success": true,
  "message": "Order oco_1234567890_abc cancelled successfully"
}
```

---

### 7. Update Market Prices

Trigger price monitoring for all active orders.

**Endpoint:** `POST /advanced-orders/update-prices`

**Response:**
```json
{
  "success": true,
  "symbols_updated": 5,
  "message": "Market prices updated successfully"
}
```

**Note:** This endpoint should be called periodically to monitor and execute orders based on current market prices.

---

## Order Status Lifecycle

### OCO Orders
1. `PENDING` → `ACTIVE` (both legs monitoring)
2. When one leg fills: `FILLED` (filled leg), `CANCELLED` (other leg)

### Bracket Orders
1. `PENDING` → `ACTIVE` (entry order)
2. Entry fills → `ACTIVE` (SL/TP now monitoring)
3. Exit triggers → `FILLED` (one exit leg), `CANCELLED` (other exit leg)

### Trailing Stop Orders
1. `PENDING` → `ACTIVE`
2. Price reaches activation → `is_activated: true`
3. Stop triggers → `FILLED`

### Iceberg Orders
1. `PENDING` → `ACTIVE`
2. Each slice executes → `PARTIALLY_FILLED`
3. All slices complete → `FILLED`

---

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid parameters)
- `404`: Order not found
- `500`: Internal server error
- `503`: Service unavailable (e.g., cannot fetch market price)

Error response format:
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Integration Notes

1. **Price Monitoring**: The system monitors prices in real-time when `update-prices` is called or when creating/updating orders
2. **Order Coordination**: OCO and Bracket orders automatically coordinate their legs
3. **Paper Trading**: All orders are executed in the paper trading environment with real market prices
4. **Persistence**: Orders are stored in memory during the server session

---

## Example Usage

### Python Example

```python
import requests

# Create an OCO order
response = requests.post(
    'http://localhost:8000/api/paper/advanced-order/oco',
    json={
        'symbol': 'BTCUSDT',
        'side': 'BUY',
        'quantity': 0.1,
        'order1': {'order_type': 'LIMIT', 'price': 50000.0},
        'order2': {'order_type': 'STOP_MARKET', 'stop_price': 45000.0}
    }
)
print(response.json())
```

### cURL Example

```bash
# Create a Bracket order
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

---

## Best Practices

1. **OCO Orders**: Use for breakout strategies where you want to catch moves in either direction
2. **Bracket Orders**: Always set realistic stop-loss and take-profit levels based on market volatility
3. **Trailing Stops**: Use activation price to avoid premature triggering in choppy markets
4. **Iceberg Orders**: Use for large positions to minimize market impact

---

## Performance

- **Order Placement**: < 100ms
- **Trigger Monitoring**: < 10ms reaction time
- **Risk Validation**: < 20ms
- **Status Updates**: Real-time (sub-second)
