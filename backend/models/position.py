from sqlalchemy import Column, String, Float, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from backend.lib.database import Base
import enum


class PositionStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class PositionSide(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"


class Position(Base):
    __tablename__ = "positions"

    id = Column(String, primary_key=True)
    symbol = Column(String, nullable=False, index=True)
    side = Column(SQLEnum(PositionSide), nullable=False)
    quantity = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    current_price = Column(Float)
    stop_loss = Column(Float)
    take_profit = Column(Float)
    trailing_stop_distance = Column(Float)
    trailing_stop_activation_price = Column(Float)
    status = Column(SQLEnum(PositionStatus), default=PositionStatus.OPEN, index=True)
    opened_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    closed_at = Column(DateTime(timezone=True))
    realized_pnl = Column(Float)
    notes = Column(String)
