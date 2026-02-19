"""Orderbook snapshot models for market database."""

from sqlalchemy import Column, String, DateTime, Integer, Index, JSON
from sqlalchemy.sql import func
from .base import Base


class OrderbookSnapshot(Base):
    """
    Order book snapshot data for market analysis.
    """

    __tablename__ = "orderbook_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    bids = Column(JSON, nullable=False)  # Top 20 bid levels
    asks = Column(JSON, nullable=False)  # Top 20 ask levels
    source = Column(String, default="binance_rest")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_symbol_timestamp", "symbol", "timestamp"),
        Index("idx_timestamp", "timestamp"),
    )
