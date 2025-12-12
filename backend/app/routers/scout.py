"""
Crypto Scout API Router
"""
from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional

from app.scout.scout_service import scout_service
from app.scout.models import (
    Opportunity, MarketOverview, ScoutStatus
)

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
    min_score: float = Query(default=0, ge=0, le=100, description="Minimum score filter"),
    limit: Optional[int] = Query(default=None, ge=1, le=100, description="Max results")
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
    interval: str = Query(default="24h", regex="^(1h|24h)$", description="Time interval"),
    limit: int = Query(default=10, ge=1, le=20, description="Number of results")
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