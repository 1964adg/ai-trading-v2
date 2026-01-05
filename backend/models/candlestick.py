"""Candlestick data models for market database."""
from sqlalchemy import Column, String, Float, DateTime, Integer, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

# Separate base for market database
CandlestickBase = declarative_base()


class Candlestick(CandlestickBase):
    """
    Candlestick/OHLCV data optimized for multi-timeframe analysis.
    Stored in market_data.db for separation of concerns.
    """
    __tablename__ = "candlesticks"
    
    # Composite primary key: symbol + interval + open_time
    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False, index=True)
    interval = Column(String, nullable=False, index=True)  # 1m, 5m, 15m, 1h, 4h, 1d
    
    # Timestamp
    open_time = Column(DateTime(timezone=True), nullable=False, index=True)
    close_time = Column(DateTime(timezone=True), nullable=False)
    
    # OHLCV data
    open_price = Column(Float, nullable=False)
    high_price = Column(Float, nullable=False)
    low_price = Column(Float, nullable=False)
    close_price = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    
    # Additional metrics
    quote_asset_volume = Column(Float)
    number_of_trades = Column(Integer)
    taker_buy_base_asset_volume = Column(Float)
    taker_buy_quote_asset_volume = Column(Float)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Composite indexes for optimized queries
    __table_args__ = (
        # Primary lookup: symbol + interval + time range
        Index('idx_symbol_interval_time', 'symbol', 'interval', 'open_time'),
        # Time-based queries
        Index('idx_open_time', 'open_time'),
        # Symbol lookups
        Index('idx_symbol', 'symbol'),
        # Unique constraint to prevent duplicates
        Index('idx_unique_candle', 'symbol', 'interval', 'open_time', unique=True),
    )


class CandlestickMetadata(CandlestickBase):
    """
    Metadata about candlestick data availability.
    Tracks which symbols and timeframes have been downloaded.
    """
    __tablename__ = "candlestick_metadata"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False)
    interval = Column(String, nullable=False)
    
    # Data range
    earliest_timestamp = Column(DateTime(timezone=True))
    latest_timestamp = Column(DateTime(timezone=True))
    total_candles = Column(Integer, default=0)
    
    # Sync status
    last_sync = Column(DateTime(timezone=True))
    sync_status = Column(String, default="pending")  # pending, syncing, complete, error
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_symbol_interval_metadata', 'symbol', 'interval', unique=True),
    )
