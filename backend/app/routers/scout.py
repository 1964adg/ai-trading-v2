"""
Crypto Scout API Router
"""

from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional

from backend.app.scout.scout_service import scout_service
from backend.app.scout.models import Opportunity, MarketOverview, ScoutStatus
from backend.app.scout.alert_manager import alert_manager
from backend.app.scout.models import AlertConfig, AlertHistory

router = APIRouter(prefix="/api/scout", tags=["scout"])


@router.post("/start")
async def start_scout():
    """Start the crypto scout"""
    await scout_service.start()
    return {"message": "🚀 Crypto Scout started!", "status": "running"}


@router.post("/stop")
async def stop_scout():
    """Stop the crypto scout"""
    await scout_service.stop()
    return {"message": "🛑 Crypto Scout stopped!", "status": "stopped"}


@router.get("/status", response_model=ScoutStatus)
async def get_status():
    """Get scout status"""
    return scout_service.get_status()


@router.get("/opportunities", response_model=List[Opportunity])
async def get_opportunities(
    min_score: float = Query(
        default=0, ge=0, le=100, description="Minimum score filter"
    ),
    limit: Optional[int] = Query(default=None, ge=1, le=100, description="Max results"),
):
    """
    Get trading opportunities

    - **min_score**: Filter by minimum score (0-100)
    - **limit**: Max number of results
    """
    opportunities = await scout_service.scan(min_score=min_score)

    if limit:
        opportunities = opportunities[:limit]

    return opportunities


@router.get("/top-movers")
async def get_top_movers(
    interval: str = Query(
        default="24h", regex="^(1h|24h)$", description="Time interval"
    ),
    limit: int = Query(default=10, ge=1, le=20, description="Number of results"),
):
    """
    Get top gaining and losing cryptos

    - **interval**: 1h or 24h
    - **limit**: Number of gainers/losers
    """
    return await scout_service.get_top_movers(interval=interval, limit=limit)


@router.get("/market-overview", response_model=MarketOverview)
async def get_market_overview():
    """Get overall market statistics"""
    return await scout_service.get_market_overview()


# ============================================
# ALERT ENDPOINTS
# ============================================


@router.get("/alerts/config", response_model=AlertConfig)
async def get_alert_config():
    """Get current alert configuration"""
    return alert_manager.get_config()


@router.post("/alerts/config")
async def update_alert_config(config: AlertConfig):
    """Update alert configuration"""
    alert_manager.configure(config)
    return {"message": "Alert configuration updated", "config": config}


@router.get("/alerts/history", response_model=AlertHistory)
async def get_alert_history(limit: int = 50, unacknowledged_only: bool = False):
    """Get alert history"""
    return alert_manager.get_history(
        limit=limit, unacknowledged_only=unacknowledged_only
    )


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """Mark alert as acknowledged"""
    success = alert_manager.acknowledge_alert(alert_id)
    if success:
        return {"message": "Alert acknowledged", "alert_id": alert_id}
    else:
        return {"message": "Alert not found", "alert_id": alert_id}


@router.post("/alerts/clear")
async def clear_alert_history():
    """Clear all alerts"""
    alert_manager.clear_history()
    return {"message": "Alert history cleared"}


@router.post("/alerts/test")
async def test_alert():
    """Trigger a test alert"""
    from backend.app.scout.models import (
        Opportunity,
        OpportunityScore,
        TechnicalIndicators,
        Signal,
    )
    from datetime import datetime

    # Create fake opportunity for testing
    test_opp = Opportunity(
        symbol="TESTUSDT",
        price=100.0,
        change_1h=1.5,
        change_24h=5.5,
        volume_24h=1000000,
        volume_change=35.0,
        score=OpportunityScore(
            total=75.0, technical=70.0, volume=80.0, momentum=75.0, volatility=70.0
        ),
        signal=Signal.STRONG_BUY,
        indicators=TechnicalIndicators(),
        reason="Test alert",
        timestamp=datetime.utcnow(),
    )

    alerts = alert_manager.check_opportunity(test_opp)
    return {
        "message": "Test alert triggered",
        "alerts_count": len([a for a in alerts if a]),
        "alerts": [a.dict() for a in alerts if a],
    }
