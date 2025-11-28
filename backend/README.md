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
```

## Project Structure

```
backend/
├── main.py                   # FastAPI app initialization + CORS + routers
├── api/
│   └── market.py            # Market data endpoints (/api/klines)
├── services/
│   └── binance_service.py   # Binance API wrapper
├── config.py                # Pydantic Settings configuration
├── requirements.txt         # Python dependencies
├── .gitignore              # Python standard ignores
└── README.md               # This file
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

## Next Steps

- Frontend MVP with React + TailwindCSS
- Real-time data with WebSocket
- Pattern detection with AI
