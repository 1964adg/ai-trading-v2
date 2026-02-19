"""Candlestick data models for market database."""

from sqlalchemy import Column, String, Float, DateTime, Integer, Index
from sqlalchemy.sql import func
from .base import Base


class Candlestick(Base):
    """
    Candlestick/OHLCV data optimized for multi-timeframe analysis.
    """

    __tablename__ = "candlesticks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False, index=True)
    interval = Column(String, nullable=False, index=True)  # 1m, 5m, 15m, 1h, 4h, 1d
    open_time = Column(DateTime(timezone=True), nullable=False, index=True)
    close_time = Column(DateTime(timezone=True), nullable=False)
    open_price = Column(Float, nullable=False)
    high_price = Column(Float, nullable=False)
    low_price = Column(Float, nullable=False)
    close_price = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    quote_asset_volume = Column(Float)
    number_of_trades = Column(Integer)
    taker_buy_base_asset_volume = Column(Float)
    taker_buy_quote_asset_volume = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_symbol_interval_time", "symbol", "interval", "open_time"),
        Index("idx_open_time", "open_time"),
        Index("idx_symbol", "symbol"),
        Index("idx_unique_candle", "symbol", "interval", "open_time", unique=True),
    )


class CandlestickMetadata(Base):
    """
    Metadata about candlestick data availability.
    Tracks which symbols and timeframes have been downloaded.
    """

    __tablename__ = "candlestick_metadata"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False)
    interval = Column(String, nullable=False)
    earliest_timestamp = Column(DateTime(timezone=True))
    latest_timestamp = Column(DateTime(timezone=True))
    total_candles = Column(Integer, default=0)
    last_sync = Column(DateTime(timezone=True))
    sync_status = Column(
        String, default="pending"
    )  # pending, syncing, complete, error, partial
    error_code = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    last_success_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        Index("idx_symbol_interval_metadata", "symbol", "interval", unique=True),
    )
