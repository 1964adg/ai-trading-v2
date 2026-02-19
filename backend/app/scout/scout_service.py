"""
Crypto Scout Service - MVP
Scans top crypto pairs and scores opportunities
"""

import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Optional
import logging

from backend.app.data.binance_client import BinanceDataCollector
from backend.app.scout.models import (
    Opportunity,
    OpportunityScore,
    TechnicalIndicators,
    Signal,
    TopMover,
    MarketOverview,
    ScoutStatus,
)
from backend.app.scout.ml_predictor import ml_predictor

logger = logging.getLogger(__name__)


class CryptoScoutService:
    """Mini Crypto Scout - MVP"""

    # Top 20 crypto pairs to monitor
    SYMBOLS = [
        "BTCUSDT",
        "ETHUSDT",
        "SOLUSDT",
        "AVAXUSDT",
        "ADAUSDT",
        "DOTUSDT",
        "POLUSDT",
        "LINKUSDT",
        "UNIUSDT",
        "ATOMUSDT",
        "LTCUSDT",
        "NEARUSDT",
        "ALGOUSDT",
        "FILUSDT",
        "APTUSDT",
        "ARBUSDT",
        "OPUSDT",
        "INJUSDT",
        "TIAUSDT",
        "SUIUSDT",
    ]

    def __init__(self):
        self.binance = BinanceDataCollector()
        self.is_running = False
        self.last_scan: Optional[datetime] = None
        self.opportunities: List[Opportunity] = []

    async def start(self):
        """Start the scout"""
        self.is_running = True
        logger.info("🚀 Crypto Scout started!")

    async def stop(self):
        """Stop the scout"""
        self.is_running = False
        logger.info("🛑 Crypto Scout stopped!")

    def get_status(self) -> ScoutStatus:
        """Get scout status"""
        return ScoutStatus(
            is_running=self.is_running,
            last_scan=self.last_scan,
            symbols_monitored=len(self.SYMBOLS),
            opportunities_found=len(self.opportunities),
        )

    async def scan(self, min_score: float = 0) -> List[Opportunity]:
        """
        Scan all symbols and find opportunities
        """
        logger.info(f"🔍 Scanning {len(self.SYMBOLS)} crypto pairs...")

        opportunities = []

        # Scan each symbol
        for symbol in self.SYMBOLS:
            try:
                opp = await self._analyze_symbol(symbol)
                if opp and opp.score.total >= min_score:
                    opportunities.append(opp)
            except Exception as e:
                logger.error(f"Error analyzing {symbol}: {e}")
                continue

        # Sort by score
        opportunities.sort(key=lambda x: x.score.total, reverse=True)

        self.opportunities = opportunities
        self.last_scan = datetime.utcnow()

        logger.info(
            f"✅ Found {len(opportunities)} opportunities (score >= {min_score})"
        )

        return opportunities

    async def _analyze_symbol(self, symbol: str) -> Optional[Opportunity]:
        """Analyze a single symbol"""

        # Get historical data (100 candles, 1h)
        df = await asyncio.to_thread(
            self.binance.get_historical_klines,
            symbol=symbol,
            interval="1h",
            days=5,  # ~120 candles
        )

        if df is None or len(df) < 50:
            return None

        # Calculate indicators
        indicators = self._calculate_indicators(df)

        # Calculate scores
        score = self._calculate_score(df, indicators)

        # Determine signal
        signal = self._determine_signal(score.total)

        # Generate reason
        reason = self._generate_reason(df, indicators, score)

        # Get current price and changes
        current_price = float(df["close"].iloc[-1])
        price_1h_ago = float(df["close"].iloc[-2]) if len(df) >= 2 else current_price
        price_24h_ago = float(df["close"].iloc[-24]) if len(df) >= 24 else current_price

        change_1h = ((current_price - price_1h_ago) / price_1h_ago) * 100
        change_24h = ((current_price - price_24h_ago) / price_24h_ago) * 100

        # Volume analysis
        recent_volume = float(df["volume"].iloc[-24:].mean())
        avg_volume = float(df["volume"].mean())
        volume_change = (
            ((recent_volume - avg_volume) / avg_volume) * 100 if avg_volume > 0 else 0
        )

        volume_24h = (
            float(df["volume"].iloc[-24:].sum())
            if len(df) >= 24
            else float(df["volume"].sum())
        )

        return Opportunity(
            symbol=symbol,
            price=current_price,
            change_1h=change_1h,
            change_24h=change_24h,
            volume_24h=volume_24h,
            volume_change=volume_change,
            score=score,
            signal=signal,
            indicators=indicators,
            reason=reason,
        )

    def _calculate_indicators(self, df: pd.DataFrame) -> TechnicalIndicators:
        """Calculate technical indicators"""

        close = df["close"]

        # RSI
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))

        # MACD
        ema_12 = close.ewm(span=12, adjust=False).mean()
        ema_26 = close.ewm(span=26, adjust=False).mean()
        macd = ema_12 - ema_26
        macd_signal = macd.ewm(span=9, adjust=False).mean()

        # Bollinger Bands
        sma_20 = close.rolling(window=20).mean()
        std_20 = close.rolling(window=20).std()
        bb_upper = sma_20 + (std_20 * 2)
        bb_lower = sma_20 - (std_20 * 2)

        # Moving averages
        sma_50 = close.rolling(window=50).mean()

        return TechnicalIndicators(
            rsi=float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None,
            macd=float(macd.iloc[-1]) if not pd.isna(macd.iloc[-1]) else None,
            macd_signal=(
                float(macd_signal.iloc[-1])
                if not pd.isna(macd_signal.iloc[-1])
                else None
            ),
            bb_upper=(
                float(bb_upper.iloc[-1]) if not pd.isna(bb_upper.iloc[-1]) else None
            ),
            bb_middle=float(sma_20.iloc[-1]) if not pd.isna(sma_20.iloc[-1]) else None,
            bb_lower=(
                float(bb_lower.iloc[-1]) if not pd.isna(bb_lower.iloc[-1]) else None
            ),
            sma_20=float(sma_20.iloc[-1]) if not pd.isna(sma_20.iloc[-1]) else None,
            sma_50=float(sma_50.iloc[-1]) if not pd.isna(sma_50.iloc[-1]) else None,
            ema_12=float(ema_12.iloc[-1]) if not pd.isna(ema_12.iloc[-1]) else None,
            ema_26=float(ema_26.iloc[-1]) if not pd.isna(ema_26.iloc[-1]) else None,
        )

    def _calculate_score(
        self, df: pd.DataFrame, indicators: TechnicalIndicators
    ) -> OpportunityScore:
        """Calculate composite score with ML integration"""

        # Technical score (0-100)
        tech_score = 50.0
        if indicators.rsi:
            if indicators.rsi < 30:
                tech_score += 25  # Oversold
            elif indicators.rsi > 70:
                tech_score -= 25  # Overbought
            elif 40 <= indicators.rsi <= 60:
                tech_score += 10  # Neutral zone

        if indicators.macd and indicators.macd_signal:
            if indicators.macd > indicators.macd_signal:
                tech_score += 15  # Bullish
            else:
                tech_score -= 15  # Bearish

        tech_score = max(0, min(100, tech_score))

        # Volume score
        recent_volume = df["volume"].iloc[-10:].mean()
        avg_volume = df["volume"].mean()
        volume_ratio = recent_volume / avg_volume if avg_volume > 0 else 1

        if volume_ratio > 1.5:
            volume_score = 80.0
        elif volume_ratio > 1.2:
            volume_score = 65.0
        elif volume_ratio > 0.8:
            volume_score = 50.0
        else:
            volume_score = 30.0

        # Momentum score
        close = df["close"]
        price_change_10 = (
            ((close.iloc[-1] - close.iloc[-10]) / close.iloc[-10]) * 100
            if len(df) >= 10
            else 0
        )

        if price_change_10 > 5:
            momentum_score = 80.0
        elif price_change_10 > 2:
            momentum_score = 65.0
        elif price_change_10 > -2:
            momentum_score = 50.0
        elif price_change_10 > -5:
            momentum_score = 35.0
        else:
            momentum_score = 20.0

        # Volatility score (lower is better for entries)
        volatility = df["close"].pct_change().std() * 100
        if volatility < 2:
            volatility_score = 70.0
        elif volatility < 4:
            volatility_score = 50.0
        else:
            volatility_score = 30.0

        # ML SCORE - NEW!
        try:
            predictions = ml_predictor.predict_price_movement(
                df, "symbol", ["5m", "15m", "60m"]
            )
            ml_score = ml_predictor.calculate_ml_score(predictions)
        except Exception as e:
            logger.warning(f"ML prediction failed: {e}")
            ml_score = 50.0  # Neutral if ML fails

        # Weighted total (ML added!)
        total_score = (
            ml_score * 0.30  # ML predictions 30%
            + tech_score * 0.25  # Technical 25% (was 35%)
            + volume_score * 0.20  # Volume 20%
            + momentum_score * 0.15  # Momentum 15%
            + volatility_score * 0.10  # Volatility 10%
        )

        return OpportunityScore(
            total=round(total_score, 2),
            technical=round(tech_score, 2),
            volume=round(volume_score, 2),
            momentum=round(momentum_score, 2),
            volatility=round(volatility_score, 2),
        )

    def _determine_signal(self, score: float) -> Signal:
        """Determine trading signal from score"""
        if score >= 75:
            return Signal.STRONG_BUY
        elif score >= 60:
            return Signal.BUY
        elif score >= 40:
            return Signal.NEUTRAL
        elif score >= 25:
            return Signal.SELL
        else:
            return Signal.STRONG_SELL

    def _generate_reason(
        self, df: pd.DataFrame, indicators: TechnicalIndicators, score: OpportunityScore
    ) -> str:
        """Generate human-readable reason"""
        reasons = []

        if indicators.rsi and indicators.rsi < 30:
            reasons.append(f"RSI oversold ({indicators.rsi:.1f})")
        elif indicators.rsi and indicators.rsi > 70:
            reasons.append(f"RSI overbought ({indicators.rsi:.1f})")

        if indicators.macd and indicators.macd_signal:
            if indicators.macd > indicators.macd_signal:
                reasons.append("MACD bullish crossover")
            else:
                reasons.append("MACD bearish crossover")

        if score.volume > 70:
            reasons.append("High volume activity")

        if score.momentum > 70:
            reasons.append("Strong upward momentum")
        elif score.momentum < 30:
            reasons.append("Weak momentum")

        return " | ".join(reasons) if reasons else "Neutral market conditions"

    async def get_top_movers(self, interval: str = "24h", limit: int = 10) -> dict:
        """Get top gainers and losers"""

        if not self.opportunities:
            await self.scan()

        # Sort by change %
        if interval == "1h":
            sorted_opps = sorted(
                self.opportunities, key=lambda x: x.change_1h, reverse=True
            )
            change_key = "change_1h"
        else:  # 24h
            sorted_opps = sorted(
                self.opportunities, key=lambda x: x.change_24h, reverse=True
            )
            change_key = "change_24h"

        # Top gainers
        gainers = [
            TopMover(
                symbol=opp.symbol,
                price=opp.price,
                change_percent=getattr(opp, change_key),
                volume_24h=opp.volume_24h,
                rank=i + 1,
            )
            for i, opp in enumerate(sorted_opps[:limit])
        ]

        # Top losers
        losers = [
            TopMover(
                symbol=opp.symbol,
                price=opp.price,
                change_percent=getattr(opp, change_key),
                volume_24h=opp.volume_24h,
                rank=i + 1,
            )
            for i, opp in enumerate(sorted_opps[-limit:][::-1])
        ]

        return {"interval": interval, "gainers": gainers, "losers": losers}

    async def get_market_overview(self) -> MarketOverview:
        """Get market overview statistics"""

        if not self.opportunities:
            await self.scan()

        bullish = sum(
            1
            for opp in self.opportunities
            if opp.signal in [Signal.BUY, Signal.STRONG_BUY]
        )
        bearish = sum(
            1
            for opp in self.opportunities
            if opp.signal in [Signal.SELL, Signal.STRONG_SELL]
        )
        neutral = sum(1 for opp in self.opportunities if opp.signal == Signal.NEUTRAL)

        avg_score = (
            sum(opp.score.total for opp in self.opportunities) / len(self.opportunities)
            if self.opportunities
            else 0
        )

        movers = await self.get_top_movers(interval="24h", limit=5)

        return MarketOverview(
            total_scanned=len(self.SYMBOLS),
            bullish_count=bullish,
            bearish_count=bearish,
            neutral_count=neutral,
            avg_score=round(avg_score, 2),
            top_gainers=movers["gainers"],
            top_losers=movers["losers"],
        )


# Global instance
scout_service = CryptoScoutService()
