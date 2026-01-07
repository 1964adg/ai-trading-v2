"""Market data API endpoints."""

import numpy as np
import pandas as pd
from binance.exceptions import BinanceAPIException
from fastapi import (
    APIRouter,
    HTTPException,
    Path,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from pydantic import BaseModel
from typing import List, Optional

from services.binance_service import binance_service
from lib.indicators import calculate_rsi, calculate_macd, calculate_bollinger_bands
from lib.risk_calculator import (
    calculate_position_size as calc_position_size,
    calculate_risk_reward as calc_risk_reward,
    calculate_portfolio_risk as calc_portfolio_risk,
)

# ✅ DB access (market DB)
from lib.database import get_db
from sqlalchemy import text
from datetime import timezone

router = APIRouter()


def _to_utc_z(dt):
    """
    Normalize a datetime to UTC and format as ISO8601 with 'Z'.
    Handles:
      - naive datetime (assumed UTC)
      - tz-aware datetime (converted to UTC)
    """
    if getattr(dt, "tzinfo", None) is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _rows_to_api_format(rows):
    out = []
    for r in rows:
        dt = r["open_time"]
        # debug (remove later)

        out.append(
            {
                "timestamp": _to_utc_z(dt),
                "open": float(r["open_price"]),
                "high": float(r["high_price"]),
                "low": float(r["low_price"]),
                "close": float(r["close_price"]),
                "volume": float(r["volume"]),
            }
        )
    return out


def _fetch_klines_from_db(symbol: str, interval: str, limit: int):
    sql = text(
        """
        SELECT
          open_time,
          open_price,
          high_price,
          low_price,
          close_price,
          volume
        FROM candlesticks
        WHERE symbol = :symbol AND interval = :interval
        ORDER BY open_time DESC
        LIMIT :limit
    """
    )
    with get_db("market") as db:
        rows = (
            db.execute(
                sql,
                {
                    "symbol": symbol.strip().upper(),
                    "interval": interval.strip(),
                    "limit": int(limit),
                },
            )
            .mappings()
            .all()
        )

    if not rows:
        return []

    # Return oldest -> newest for charting
    rows.reverse()
    return _rows_to_api_format(rows)


async def _fetch_klines_data(symbol: str, interval: str, limit: int):
    """
    DB-first: try candlesticks table, fallback to Binance.
    Payload kept identical: {"success": True, "data": ...}
    """
    try:
        # 1) Try DB first
        db_data = _fetch_klines_from_db(symbol=symbol, interval=interval, limit=limit)
        if db_data:
            return {"success": True, "data": db_data}

        # 2) Fallback to Binance (legacy behavior)
        data = binance_service.get_klines_data(
            symbol=symbol.strip().upper(), interval=interval.strip(), limit=limit
        )

        # ✅ Convert DataFrame to dict for fast JSON serialization
        if hasattr(data, "to_dict"):
            data = data.to_dict("records")

        return {"success": True, "data": data}
    except BinanceAPIException as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {e.message}")
    except ConnectionError:
        raise HTTPException(status_code=503, detail="Unable to connect to Binance API")
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/klines")
async def get_klines_query(
    symbol: str = Query(..., description="Trading pair symbol (e.g., BTCEUR)"),
    timeframe: str = Query(
        ..., description="Timeframe interval (e.g., 1m, 5m, 15m, 1h, 4h, 1d)"
    ),
    limit: int = Query(100, description="Number of candles to return", ge=1, le=1000),
):
    return await _fetch_klines_data(symbol=symbol, interval=timeframe, limit=limit)


@router.get("/klines/{symbol}/{interval}")
async def get_klines_path(
    symbol: str = Path(..., description="Trading pair symbol"),
    interval: str = Path(..., description="Kline interval"),
    limit: int = Query(default=500, ge=1, le=1000),
):
    return await _fetch_klines_data(symbol=symbol, interval=interval, limit=limit)


#
# ============================================================================
# PHASE A: TECHNICAL INDICATORS ENDPOINTS
# ============================================================================


@router.get("/indicators/rsi/{symbol}/{interval}")
async def get_rsi(
    symbol: str = Path(..., description="Trading pair symbol"),
    interval: str = Path(..., description="Timeframe"),
    period: int = Query(14, description="RSI period", ge=2, le=100),
    limit: int = Query(100, description="Number of candles", ge=10, le=500),
):
    """Calculate RSI indicator"""
    try:
        print(f"[RSI] Request:  {symbol} {interval}, period={period}, limit={limit}")

        # Fetch klines data
        klines_response = await _fetch_klines_data(symbol, interval, limit)

        if not klines_response["success"]:
            print(f"[RSI] ❌ Failed to fetch klines")
            raise HTTPException(status_code=404, detail="No klines data")

        print(f"[RSI] ✅ Got {len(klines_response['data'])} candles")

        # Convert to DataFrame
        df = pd.DataFrame(klines_response["data"])

        print(f"[RSI] DataFrame columns:  {df.columns.tolist()}")
        print(f"[RSI] DataFrame shape: {df.shape}")
        print(f"[RSI] Close column dtype: {df['close'].dtype}")

        # ✅ FIX: Convert close prices to float numpy array
        closes = df["close"].astype(float).values

        print(f"[RSI] Closes type: {type(closes)}")
        print(f"[RSI] Closes dtype: {closes.dtype}")
        print(f"[RSI] Closes shape: {closes.shape}")
        print(f"[RSI] First 5 closes: {closes[: 5]}")

        # Calculate RSI
        result = calculate_rsi(closes, period)

        print(f"[RSI] ✅ Result: {result}")

        return {
            "success": True,
            "symbol": symbol,
            "interval": interval,
            "indicator": "RSI",
            "period": period,
            **result,
        }
    except Exception as e:
        print(f"[RSI ERROR] {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/indicators/macd/{symbol}/{interval}")
async def get_macd(
    symbol: str = Path(...),
    interval: str = Path(...),
    fast: int = Query(12, ge=2, le=50),
    slow: int = Query(26, ge=2, le=100),
    signal: int = Query(9, ge=2, le=50),
    limit: int = Query(100, ge=20, le=500),
):
    """Calculate MACD indicator"""
    try:
        print(
            f"[MACD] Request: {symbol} {interval}, fast={fast}, slow={slow}, signal={signal}"
        )

        klines_response = await _fetch_klines_data(symbol, interval, limit)

        if not klines_response["success"]:
            raise HTTPException(status_code=404, detail="No klines data")

        df = pd.DataFrame(klines_response["data"])

        # ✅ FIX: Convert to float
        closes = df["close"].astype(float).values

        result = calculate_macd(closes, fast, slow, signal)

        print(f"[MACD] ✅ Result: {result}")

        return {
            "success": True,
            "symbol": symbol,
            "interval": interval,
            "indicator": "MACD",
            **result,
        }
    except Exception as e:
        print(f"[MACD ERROR] {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/indicators/bollinger/{symbol}/{interval}")
async def get_bollinger(
    symbol: str = Path(...),
    interval: str = Path(...),
    period: int = Query(20, ge=2, le=100),
    std_dev: float = Query(2.0, ge=0.5, le=5.0),
    limit: int = Query(100, ge=20, le=500),
):
    """Calculate Bollinger Bands"""
    try:
        print(
            f"[BOLLINGER] Request: {symbol} {interval}, period={period}, std_dev={std_dev}"
        )

        klines_response = await _fetch_klines_data(symbol, interval, limit)

        if not klines_response["success"]:
            raise HTTPException(status_code=404, detail="No klines data")

        df = pd.DataFrame(klines_response["data"])

        # ✅ FIX: Convert to float
        closes = df["close"].astype(float).values

        result = calculate_bollinger_bands(closes, period, std_dev)

        print(f"[BOLLINGER] ✅ Result:  {result}")

        return {
            "success": True,
            "symbol": symbol,
            "interval": interval,
            "indicator": "Bollinger Bands",
            **result,
        }
    except Exception as e:
        print(f"[BOLLINGER ERROR] {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PHASE B: RISK MANAGEMENT ENDPOINTS
# ============================================================================


class PositionSizeRequest(BaseModel):
    """Request model for position size calculation."""

    account_balance: float
    risk_percentage: float
    entry_price: float
    stop_loss_price: float
    leverage: int = 1


@router.post("/risk/position-size")
async def calculate_position_size_endpoint(request: PositionSizeRequest):
    """
    Calculate optimal position size based on risk parameters.

    Args:
        request: PositionSizeRequest with account balance, risk %, entry, stop-loss, leverage

    Returns:
        Position size, quantity, risk amount, and safety warnings
    """
    try:
        result = calc_position_size(
            account_balance=request.account_balance,
            risk_percentage=request.risk_percentage,
            entry_price=request.entry_price,
            stop_loss_price=request.stop_loss_price,
            leverage=request.leverage,
        )

        return {"success": True, **result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


class RiskRewardRequest(BaseModel):
    """Request model for risk/reward calculation."""

    entry_price: float
    stop_loss_price: float
    take_profit_price: float
    position_size: Optional[float] = None


@router.post("/risk/risk-reward")
async def calculate_risk_reward_endpoint(request: RiskRewardRequest):
    """
    Calculate risk/reward ratio for a trade.

    Args:
        request: RiskRewardRequest with entry, stop-loss, take-profit, optional position size

    Returns:
        R:R ratio, direction, risk/reward percentages, potential P/L, recommendations
    """
    try:
        result = calc_risk_reward(
            entry_price=request.entry_price,
            stop_loss_price=request.stop_loss_price,
            take_profit_price=request.take_profit_price,
            position_size=request.position_size,
        )

        return {"success": True, **result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


class PortfolioRiskRequest(BaseModel):
    """Request model for portfolio risk calculation."""

    account_balance: float
    positions: List[dict]
    max_risk_pct: float = 10.0


@router.post("/risk/portfolio")
async def calculate_portfolio_risk_endpoint(request: PortfolioRiskRequest):
    """
    Calculate aggregate risk across multiple positions.

    Args:
        request: PortfolioRiskRequest with account balance, positions list, max risk %

    Returns:
        Total exposure, risk percentage, positions analyzed, warnings
    """
    try:
        result = calc_portfolio_risk(
            account_balance=request.account_balance,
            positions=request.positions,
            max_risk_pct=request.max_risk_pct,
        )

        return {"success": True, **result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


# ============================================================================
# PHASE C: BACKTESTING ENDPOINT
# ============================================================================


class BacktestRequest(BaseModel):
    """Request model for backtesting."""

    symbol: str
    timeframe: str
    strategy: str  # 'ma_cross' or 'rsi'
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    initial_capital: float = 10000
    position_size_pct: float = 100
    allow_shorts: bool = True
    # Strategy parameters
    fast_period: int = 9
    slow_period: int = 21
    rsi_period: int = 14
    rsi_oversold: int = 30
    rsi_overbought: int = 70
    stop_loss_pct: float = 2.0
    take_profit_pct: float = 4.0


@router.post("/backtest")
async def run_backtest(request: BacktestRequest):
    """
    Run a backtest on historical data with specified strategy.

    Args:
        request: BacktestRequest with symbol, timeframe, strategy, and parameters

    Returns:
        Comprehensive backtest results with trades, metrics, and equity curve
    """
    try:
        from lib.backtester import Backtester, SimpleMAStrategy, RSIStrategy

        print(f"[BACKTEST] Starting backtest for {request.symbol} {request.timeframe}")

        # Fetch historical data
        klines = binance_service.get_klines_data(
            symbol=request.symbol.upper(), interval=request.timeframe, limit=1000
        )

        # Convert to DataFrame if not already
        if not isinstance(klines, pd.DataFrame):
            klines = pd.DataFrame(klines)

        print(f"[BACKTEST] Got {len(klines)} candles")

        # Ensure we have the required columns
        if "close" not in klines.columns:
            raise HTTPException(status_code=400, detail="Data missing 'close' column")

        # Convert timestamp to datetime index if needed
        if "timestamp" in klines.columns:
            klines["timestamp"] = pd.to_datetime(klines["timestamp"])
            klines.set_index("timestamp", inplace=True)
        elif "time" in klines.columns:
            klines["time"] = pd.to_datetime(klines["time"])
            klines.set_index("time", inplace=True)

        # Filter by date range if provided
        if request.start_date:
            start_dt = pd.to_datetime(request.start_date)
            klines = klines[klines.index >= start_dt]

        if request.end_date:
            end_dt = pd.to_datetime(request.end_date)
            klines = klines[klines.index <= end_dt]

        print(f"[BACKTEST] Date range: {klines.index[0]} to {klines.index[-1]}")

        if len(klines) < 50:
            raise HTTPException(
                status_code=400,
                detail="Not enough data for backtesting (need at least 50 candles)",
            )

        # Create strategy based on request
        if request.strategy == "ma_cross":
            strategy = SimpleMAStrategy(
                fast_period=request.fast_period,
                slow_period=request.slow_period,
                stop_loss_pct=request.stop_loss_pct,
                take_profit_pct=request.take_profit_pct,
            )
        elif request.strategy == "rsi":
            strategy = RSIStrategy(
                rsi_period=request.rsi_period,
                oversold=request.rsi_oversold,
                overbought=request.rsi_overbought,
                stop_loss_pct=request.stop_loss_pct,
                take_profit_pct=request.take_profit_pct,
            )
        else:
            raise HTTPException(
                status_code=400, detail=f"Unknown strategy: {request.strategy}"
            )

        # Create backtester
        backtester = Backtester(
            data=klines,
            strategy=strategy,
            initial_capital=request.initial_capital,
            position_size_pct=request.position_size_pct,
            fee_pct=0.1,
            allow_shorts=request.allow_shorts,
        )

        # Run backtest
        result = backtester.run()

        print(f"[BACKTEST] ✅ Backtest complete: {result.total_trades} trades")

        # Convert trades to dicts for JSON serialization
        trades_data = [
            {
                "entry_time": t.entry_time,
                "exit_time": t.exit_time,
                "entry_price": t.entry_price,
                "exit_price": t.exit_price,
                "quantity": t.quantity,
                "side": t.side,
                "pnl": t.pnl,
                "pnl_percent": t.pnl_percent,
                "fees": t.fees,
                "result": t.result,
            }
            for t in result.trades
        ]

        return {
            "success": True,
            "symbol": request.symbol.upper(),
            "timeframe": request.timeframe,
            "strategy": request.strategy,
            "total_trades": result.total_trades,
            "winning_trades": result.winning_trades,
            "losing_trades": result.losing_trades,
            "win_rate": result.win_rate,
            "total_pnl": result.total_pnl,
            "total_pnl_percent": result.total_pnl_percent,
            "avg_win": result.avg_win,
            "avg_loss": result.avg_loss,
            "largest_win": result.largest_win,
            "largest_loss": result.largest_loss,
            "profit_factor": result.profit_factor,
            "sharpe_ratio": result.sharpe_ratio,
            "max_drawdown": result.max_drawdown,
            "max_drawdown_percent": result.max_drawdown_percent,
            "total_fees": result.total_fees,
            "initial_capital": result.initial_capital,
            "final_capital": result.final_capital,
            "start_date": result.start_date,
            "end_date": result.end_date,
            "equity_curve": result.equity_curve,
            "trades": trades_data,
        }

    except BinanceAPIException as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {e.message}")
    except Exception as e:
        import traceback

        print(f"[BACKTEST] ❌ Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Backtest error: {str(e)}")
