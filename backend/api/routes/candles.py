import sys
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from models.candlestick import Candlestick
from lib.database import get_db
import datetime
from binance.client import Client


def get_market_db():
    db_gen = get_db("market")
    db = next(db_gen)
    try:
        yield db
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass


from services.candlestick_service import save_candlestick
from datetime import datetime

router = APIRouter()


@router.post("/candles/")
def create_candle(candle: dict, db: Session = Depends(get_market_db)):
    # Controllo dati obbligatori
    required_keys = [
        "symbol",
        "interval",
        "open_time",
        "close_time",
        "open_price",
        "high_price",
        "low_price",
        "close_price",
        "volume",
    ]
    for key in required_keys:
        if key not in candle:
            return {"error": f"Missing {key}"}
    candle["open_time"] = datetime.fromisoformat(candle["open_time"])
    candle["close_time"] = datetime.fromisoformat(candle["close_time"])
    return save_candlestick(db=db, **candle)


@router.delete("/candles/{candle_id}")
def delete_candle(candle_id: int, db: Session = Depends(get_market_db)):
    print("DEBUG: Cerco candela con id =", candle_id)
    candle = db.query(Candlestick).filter(Candlestick.id == candle_id).first()
    print("DEBUG: Query result:", candle)
    if not candle:
        raise HTTPException(status_code=404, detail="Candle not found")
    db.delete(candle)
    db.commit()
    print(f"DEBUG: Provo a eliminare id: {candle_id}", file=sys.stderr)
    candle = db.query(Candlestick).filter(Candlestick.id == candle_id).first()
    print(f"DEBUG: Risultato query: {candle}", file=sys.stderr)
    return {"success": True}


@router.post("/candles/fetch")
def batch_fetch_candles(request: dict, db: Session = Depends(get_market_db)):
    import datetime
    from binance.client import Client

    try:
        symbol = request.get("symbol", "BTCEUR").upper()
        interval = request.get("interval", "1h")
        limit = int(request.get("limit", 500))
        start_str = request.get("start_time")  # es: "2024-02-07T00:00:00"
        client = Client()
        if start_str:
            start_time = int(
                datetime.datetime.fromisoformat(start_str).timestamp() * 1000
            )
        else:
            now = datetime.datetime.utcnow()
            start_time = int((now - datetime.timedelta(hours=limit)).timestamp() * 1000)
        klines = client.get_klines(
            symbol=symbol, interval=interval, startTime=start_time, limit=limit
        )
        count = 0
        for k in klines:
            open_time = datetime.datetime.utcfromtimestamp(k[0] / 1000)
            close_time = datetime.datetime.utcfromtimestamp(k[6] / 1000)
            exists = (
                db.query(Candlestick)
                .filter(
                    Candlestick.symbol == symbol,
                    Candlestick.interval == interval,
                    Candlestick.open_time == open_time,
                )
                .first()
            )
            if exists:
                continue
            db.add(
                Candlestick(
                    symbol=symbol,
                    interval=interval,
                    open_time=open_time,
                    close_time=close_time,
                    open_price=float(k[1]),
                    high_price=float(k[2]),
                    low_price=float(k[3]),
                    close_price=float(k[4]),
                    volume=float(k[5]),
                )
            )
            count += 1
        db.commit()
        return {"success": True, "inserted": count}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/candles/")
def list_candles(
    db: Session = Depends(get_market_db),
    symbol: str = Query(None),
    interval: str = Query(None),
    limit: int = Query(50),
):
    q = db.query(Candlestick)
    if symbol:
        q = q.filter(Candlestick.symbol == symbol)
    if interval:
        q = q.filter(Candlestick.interval == interval)
    import sys

    print(
        "DEBUG: Lista candele da GET id:",
        [c.id for c in q.order_by(Candlestick.id.desc()).limit(limit).all()],
        file=sys.stderr,
    )
    return q.order_by(Candlestick.id.desc()).limit(limit).all()
