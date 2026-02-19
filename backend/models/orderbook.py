"""Orderbook snapshot models for market database."""

from sqlalchemy import Column, String, DateTime, Integer, Index, JSON
from sqlalchemy.sql import func
from backend.lib.database import Base


class OrderbookSnapshot(Base):
    """
    Order book snapshot data for market analysis.
    Stores top 20 bids and asks at periodic intervals.
    Stored in market_data.db for separation of concerns.
    """

    __tablename__ = "orderbook_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False, index=True)

    # Timestamp (timezone-aware)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)

    # Order book data (top 20 levels)
    # Format: [{"price": "50000.00", "qty": "1.5"}, ...]
    bids = Column(JSON, nullable=False)  # Top 20 bid levels
    asks = Column(JSON, nullable=False)  # Top 20 ask levels

    # Source of data (e.g., "binance_rest", "binance_ws")
    source = Column(String, default="binance_rest")

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Composite indexes for optimized queries
    __table_args__ = (
        # Primary lookup: symbol + time
        Index("idx_symbol_timestamp", "symbol", "timestamp"),
        # Time-based queries
        Index("idx_timestamp", "timestamp"),
    )
