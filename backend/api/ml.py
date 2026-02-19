"""ML API endpoints."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from backend.services.ml_service import ml_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/ml/insights/{symbol}")
async def get_ml_insights(
    symbol: str,
    timeframe: str = Query(default="1m", description="Timeframe (e.g., 1m, 5m, 15m)"),
):
    """
    Get comprehensive ML insights for a trading symbol.

    Args:
        symbol: Trading symbol (e.g., BTCUSDT, ETHUSDT)
        timeframe: Timeframe for analysis

    Returns:
        JSON with patterns, price predictions, and trading signals
    """
    try:
        insights = ml_service.get_ml_insights(symbol.upper(), timeframe)
        return insights
    except Exception as e:
        logger.error(f"Failed to get ML insights: {e}")
        raise HTTPException(status_code=500, detail=f"ML insights failed: {str(e)}")


@router.get("/ml/patterns/{symbol}")
async def get_patterns(
    symbol: str,
    timeframe: str = Query(default="1m", description="Timeframe (e.g., 1m, 5m, 15m)"),
):
    """
    Get candlestick pattern predictions only.

    Args:
        symbol: Trading symbol (e.g., BTCUSDT, ETHUSDT)
        timeframe: Timeframe for analysis

    Returns:
        JSON with detected patterns and confidences
    """
    try:
        insights = ml_service.get_ml_insights(symbol.upper(), timeframe)

        return {
            "symbol": symbol,
            "patterns": insights.get("patterns", {}),
            "timestamp": insights.get("timestamp"),
            "model_status": insights.get("model_status", {}),
        }
    except Exception as e:
        logger.error(f"Failed to get patterns: {e}")
        raise HTTPException(
            status_code=500, detail=f"Pattern detection failed: {str(e)}"
        )


@router.get("/ml/price-prediction/{symbol}")
async def get_price_prediction(
    symbol: str,
    timeframe: str = Query(default="1m", description="Timeframe (e.g., 1m, 5m, 15m)"),
):
    """
    Get price predictions only.

    Args:
        symbol: Trading symbol (e.g., BTCUSDT, ETHUSDT)
        timeframe: Timeframe for analysis

    Returns:
        JSON with multi-horizon price predictions
    """
    try:
        insights = ml_service.get_ml_insights(symbol.upper(), timeframe)

        return {
            "symbol": symbol,
            "current_price": insights.get("current_price", 0.0),
            "price_predictions": insights.get("price_predictions", {}),
            "timestamp": insights.get("timestamp"),
            "model_status": insights.get("model_status", {}),
        }
    except Exception as e:
        logger.error(f"Failed to get price predictions: {e}")
        raise HTTPException(
            status_code=500, detail=f"Price prediction failed: {str(e)}"
        )


@router.get("/ml/signals/{symbol}")
async def get_signals(
    symbol: str,
    timeframe: str = Query(default="1m", description="Timeframe (e.g., 1m, 5m, 15m)"),
):
    """
    Get AI-generated trading signals only.

    Args:
        symbol: Trading symbol (e.g., BTCUSDT, ETHUSDT)
        timeframe: Timeframe for analysis

    Returns:
        JSON with trading signals (BUY/SELL)
    """
    try:
        insights = ml_service.get_ml_insights(symbol.upper(), timeframe)

        return {
            "symbol": symbol,
            "signals": insights.get("signals", []),
            "confidence": insights.get("confidence", 0.0),
            "timestamp": insights.get("timestamp"),
            "model_status": insights.get("model_status", {}),
        }
    except Exception as e:
        logger.error(f"Failed to get signals: {e}")
        raise HTTPException(
            status_code=500, detail=f"Signal generation failed: {str(e)}"
        )


@router.get("/ml/status")
async def get_ml_status():
    """
    Get ML model status.

    Returns:
        JSON with model availability and training status
    """
    try:
        status = ml_service.get_model_status()

        return {
            "status": "online",
            "models": status,
            "message": (
                "ML models ready"
                if status.get("models_loaded")
                else "Models not trained yet"
            ),
        }
    except Exception as e:
        logger.error(f"Failed to get ML status: {e}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")
