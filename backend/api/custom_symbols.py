from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.models.custom_symbols import CustomSymbol
from backend.utils.binance import is_symbol_on_binance
from backend.lib.database import get_db

router = APIRouter()


@router.get("/custom-symbols")
def get_symbols(db: Session = Depends(get_db)):
    return [s.symbol for s in db.query(CustomSymbol).all()]


@router.post("/custom-symbols")
def add_symbol(symbol: str, db: Session = Depends(get_db)):
    if not is_symbol_on_binance(symbol):
        raise HTTPException(status_code=400, detail="Simbolo non supportato su Binance")
    if db.query(CustomSymbol).filter_by(symbol=symbol).first():
        raise HTTPException(status_code=400, detail="Simbolo già presente")
    new = CustomSymbol(symbol=symbol)
    db.add(new)
    db.commit()
    return {"symbol": symbol}


@router.delete("/custom-symbols/{symbol}")
def remove_symbol(symbol: str, db: Session = Depends(get_db)):
    obj = db.query(CustomSymbol).filter_by(symbol=symbol).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Simbolo non trovato")
    db.delete(obj)
    db.commit()
    return {"removed": symbol}
