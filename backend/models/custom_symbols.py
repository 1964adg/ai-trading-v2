from sqlalchemy import Column, Integer, String
from backend.lib.database import Base


class CustomSymbol(Base):
    __tablename__ = "custom_symbols"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(24), unique=True, nullable=False)
