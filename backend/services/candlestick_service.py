from models.candlestick import Candlestick
from sqlalchemy.orm import Session
from datetime import datetime

def save_candlestick(
    db: Session,
    symbol: str,
    interval: str,
    open_time: datetime,
    close_time: datetime,
    open_price: float,
    high_price: float,
    low_price: float,
    close_price: float,
    volume: float,
    quote_asset_volume: float = None,
    number_of_trades: int = None,
    taker_buy_base_asset_volume: float = None,
    taker_buy_quote_asset_volume: float = None,
):
    candle = Candlestick(
        symbol=symbol,
        interval=interval,
        open_time=open_time,
        close_time=close_time,
        open_price=open_price,
        high_price=high_price,
        low_price=low_price,
        close_price=close_price,
        volume=volume,
        quote_asset_volume=quote_asset_volume,
        number_of_trades=number_of_trades,
        taker_buy_base_asset_volume=taker_buy_base_asset_volume,
        taker_buy_quote_asset_volume=taker_buy_quote_asset_volume,
    )
    db.add(candle)
    db.commit()
    db.refresh(candle)
    return candle