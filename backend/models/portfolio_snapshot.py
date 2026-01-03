from sqlalchemy import Column, Integer, Float, DateTime
from sqlalchemy.sql import func
from .base import Base

class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    balance = Column(Float, nullable=False)
    total_pnl = Column(Float, default=0.0)
    realized_pnl = Column(Float, default=0.0)
    unrealized_pnl = Column(Float, default=0.0)
    positions_count = Column(Integer, default=0)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
