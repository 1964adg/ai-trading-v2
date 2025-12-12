"""
Crypto Scout - Data Models
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class Signal(str, Enum):
    """Signal types"""
    STRONG_BUY = "STRONG_BUY"
    BUY = "BUY"
    NEUTRAL = "NEUTRAL"
    SELL = "SELL"
    STRONG_SELL = "STRONG_SELL"


class OpportunityScore(BaseModel):
    """Detailed score breakdown"""
    total:  float = Field(..., ge=0, le=100, description="Total score 0-100")
    technical: float = Field(..., ge=0, le=100, description="Technical indicators score")
    volume: float = Field(..., ge=0, le=100, description="Volume score")
    momentum: float = Field(..., ge=0, le=100, description="Momentum score")
    volatility: float = Field(..., ge=0, le=100, description="Volatility score")


class TechnicalIndicators(BaseModel):
    """Technical indicators"""
    rsi: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    ema_12: Optional[float] = None
    ema_26: Optional[float] = None


class Opportunity(BaseModel):
    """Trading opportunity"""
    symbol: str
    price: float
    change_1h: float = Field(..., description="Price change % last 1h")
    change_24h: float = Field(..., description="Price change % last 24h")
    volume_24h: float = Field(..., description="24h volume in USDT")
    volume_change:  float = Field(..., description="Volume change % vs avg")
    score: OpportunityScore
    signal: Signal
    indicators: TechnicalIndicators
    reason: str = Field(..., description="Why this is an opportunity")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TopMover(BaseModel):
    """Top gaining/losing crypto"""
    symbol: str
    price: float
    change_percent: float
    volume_24h: float
    rank: int


class MarketOverview(BaseModel):
    """Overall market statistics"""
    total_scanned: int
    bullish_count: int
    bearish_count: int
    neutral_count: int
    avg_score: float
    top_gainers: List[TopMover]
    top_losers: List[TopMover]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ScoutStatus(BaseModel):
    """Scout service status"""
    is_running: bool
    last_scan: Optional[datetime] = None
    symbols_monitored: int
    opportunities_found: int