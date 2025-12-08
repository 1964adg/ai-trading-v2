# AI Trading Backend MVP

Backend for AI Trading Dashboard - Paper Trading Crypto.

## Requirements

- Python 3.11+

## Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

## Test Endpoints

```bash
# Health check
curl http://localhost:8000/

# Get klines data
curl "http://localhost:8000/api/klines/BTCEUR/15m?limit=100"

# Create paper trading order
curl -X POST http://localhost:8000/api/paper/order \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTCUSDT", "side": "BUY", "type": "LIMIT", "quantity": 0.001, "price": 50000.0}'

# Get active positions
curl http://localhost:8000/api/paper/positions

# Get portfolio status
curl http://localhost:8000/api/paper/portfolio
```

## Project Structure

```
backend/
├── main.py                      # FastAPI app initialization + CORS + routers
├── api/
│   ├── market.py               # Market data endpoints (/api/klines)
│   └── paper_trading.py        # Paper trading endpoints (/api/paper)
├── services/
│   ├── binance_service.py      # Binance API wrapper
│   └── paper_trading_service.py # Paper trading position management
├── config.py                   # Pydantic Settings configuration
├── requirements.txt            # Python dependencies
├── .gitignore                 # Python standard ignores
└── README.md                  # This file
```

## API Endpoints

### GET /
Health check endpoint.

**Response:**
```json
{"status": "online", "version": "1.0.0"}
```

### GET /api/klines/{symbol}/{interval}
Get candlestick data for a trading pair.

**Parameters:**
- `symbol` (path): Trading pair symbol (e.g., BTCEUR, ETHUSDT)
- `interval` (path): Kline interval (e.g., 15m, 1h, 4h, 1d)
- `limit` (query, optional): Number of klines (1-1000, default: 500)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": 1701234567000,
      "open": 96234.56,
      "high": 96456.78,
      "low": 96100.00,
      "close": 96350.00,
      "volume": 123.45
    }
  ]
}
```

### POST /api/paper/order
Create a paper trading order.

**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",          // or "SELL"
  "type": "LIMIT",        // or "MARKET", "STOP_LIMIT", etc.
  "quantity": 0.001,
  "price": 50000.0        // optional for MARKET orders
}
```

**Response:**
```json
{
  "status": "executed",
  "order_id": "15707ac6-4170-4bcc-9ffd-8d2632e0ff9b",
  "timestamp": "2025-12-08T22:54:07.620867",
  "symbol": "BTCUSDT",
  "type": "buy",
  "quantity": 0.001,
  "price": 50000.0
}
```

### GET /api/paper/positions
Get all active paper trading positions with real-time P&L.

**Response:**
```json
{
  "positions": [
    {
      "id": "15707ac6-4170-4bcc-9ffd-8d2632e0ff9b",
      "symbol": "BTCUSDT",
      "type": "buy",
      "quantity": 0.001,
      "entry_price": 50000.0,
      "current_price": 51000.0,
      "current_pnl": 1.0,
      "timestamp": "2025-12-08T22:54:07.620867",
      "status": "open"
    }
  ]
}
```

### GET /api/paper/portfolio
Get paper trading portfolio status.

**Response:**
```json
{
  "balance": 10000.0,
  "total_pnl": 1.0,
  "unrealized_pnl": 1.0,
  "realized_pnl": 0.0,
  "positions_count": 1
}
```

### DELETE /api/paper/position/{id}
Close a paper trading position.

**Response:**
```json
{
  "id": "15707ac6-4170-4bcc-9ffd-8d2632e0ff9b",
  "symbol": "BTCUSDT",
  "type": "buy",
  "quantity": 0.001,
  "entry_price": 50000.0,
  "closing_price": 51000.0,
  "realized_pnl": 1.0,
  "timestamp": "2025-12-08T22:54:07.620867",
  "closed_at": "2025-12-08T22:55:30.123456"
}
```

## Features

- **Real-time Market Data**: Fetch live candlestick data from Binance
- **Paper Trading**: Simulate trading with real-time prices
- **Position Management**: Track positions and calculate P&L in real-time
- **In-Memory Storage**: Session-based position tracking (no database required)
- **CORS Support**: Frontend communication enabled
- **WebSocket Support**: Live market data streaming

## Next Steps

- Frontend MVP with React + TailwindCSS
- Real-time data with WebSocket
- Pattern detection with AI
