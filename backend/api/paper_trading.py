"""Paper trading API endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from services.paper_trading_service import paper_trading_service
from services.binance_service import binance_service
from sqlalchemy.orm import Session

router = APIRouter()


def get_db_session():
    """Get database session for dependency injection."""
    try:
        from lib.database import get_db_session as _get_db_session
        return _get_db_session()
    except:
        # Database not initialized, return None
        return None


class OrderRequest(BaseModel):
    """Paper trading order request model."""
    symbol: str = Field(..., description="Trading pair symbol (e.g., BTCUSDT)")
    side: str = Field(..., description="Order side: 'BUY' or 'SELL'")
    type: str = Field(..., description="Order type: 'MARKET', 'LIMIT', etc.")
    quantity: float = Field(..., gt=0, description="Order quantity")
    price: Optional[float] = Field(None, description="Order price (optional for MARKET orders)")
    stopPrice: Optional[float] = Field(None, description="Stop price for stop orders")
    timeInForce: Optional[str] = Field(None, description="Time in force: 'GTC', 'IOC', 'FOK'")
    reduceOnly: Optional[bool] = Field(None, description="Reduce only flag")


class PositionUpdateRequest(BaseModel):
    """Position update request model."""
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    trailing_stop_distance: Optional[float] = None
    trailing_stop_activation_price: Optional[float] = None


@router.post("/order")
async def create_paper_order(order: OrderRequest, db: Session = Depends(get_db_session)):
    """
    Create a paper trading order.
    
    Args:
        order: Order request with type, symbol, quantity, and optional price
        db: Database session
        
    Returns:
        Order response with status, order_id, and timestamp
    """
    try:
        # Validate order side
        if order.side.upper() not in ["BUY", "SELL"]:
            raise HTTPException(status_code=400, detail="Order side must be 'BUY' or 'SELL'")
        
        # Determine execution price
        execution_price = order.price
        
        # For MARKET orders or when no price is provided, fetch current market price
        if execution_price is None:
            try:
                # Get the latest price from Binance
                klines = binance_service.get_klines_data(
                    symbol=order.symbol.upper(),
                    interval="1m",
                    limit=1
                )
                # Fix: Use proper DataFrame validation
                if klines is not None and not klines.empty:
                    # Convert to dict for safe access
                    klines_dict = klines.to_dict('records')
                    if klines_dict:
                        execution_price = float(klines_dict[0]["close"])
                    else:
                        raise HTTPException(status_code=503, detail="Unable to fetch market price")
                else:
                    raise HTTPException(status_code=503, detail="Unable to fetch market price")
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"Unable to fetch market price: {str(e)}")
        
        # Create the order
        result = paper_trading_service.create_order(
            order_type=order.side.lower(),
            symbol=order.symbol.upper(),
            quantity=order.quantity,
            price=execution_price,
            db=db
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.get("/positions")
async def get_paper_positions(db: Session = Depends(get_db_session)):
    """
    Get all active paper trading positions.
    
    Args:
        db: Database session
    
    Returns:
        List of active positions with current P&L
    """
    try:
        positions = paper_trading_service.get_positions(db=db)
        
        # Update current prices and P&L for each position
        import logging
        for position in positions:
            try:
                # Fetch current market price
                klines = binance_service.get_klines_data(
                    symbol=position["symbol"],
                    interval="1m",
                    limit=1
                )
                # Fix: Use proper DataFrame validation
                if klines is not None and not klines.empty:
                    # Convert to dict for safe access
                    klines_dict = klines.to_dict('records')
                    if klines_dict:
                        current_price = float(klines_dict[0]["close"])
                        # Update in service (which also calculates P&L)
                        paper_trading_service.update_position_price(position["id"], current_price, db=db)
            except Exception as e:
                logging.warning(f"Failed to update price for {position['symbol']}: {e}")
                # Keep the position with last known values
        
        # Get fresh positions data after all updates
        positions = paper_trading_service.get_positions(db=db)
        
        return {"positions": positions}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch positions: {str(e)}")


@router.get("/portfolio")
async def get_paper_portfolio():
    """
    Get paper trading portfolio status.
    
    Returns:
        Portfolio information including balance, total P&L, and position count
    """
    try:
        portfolio = paper_trading_service.get_portfolio()
        return portfolio
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio: {str(e)}")


@router.delete("/position/{position_id}")
async def close_paper_position(position_id: str, db: Session = Depends(get_db_session)):
    """
    Close a paper trading position.
    
    Args:
        position_id: ID of the position to close
        db: Database session
        
    Returns:
        Closed position details with realized P&L
    """
    try:
        # Get position to find symbol
        positions = paper_trading_service.get_positions(db=db)
        position = next((p for p in positions if p["id"] == position_id), None)
        
        if not position:
            raise HTTPException(status_code=404, detail="Position not found")
        
        # Fetch current market price for closing
        klines = binance_service.get_klines_data(
            symbol=position["symbol"],
            interval="1m",
            limit=1
        )
        
        # Fix: Use proper DataFrame validation
        if klines is None or klines.empty:
            raise HTTPException(status_code=503, detail="Unable to fetch market price for closing")
        
        # Convert to dict for safe access
        klines_dict = klines.to_dict('records')
        if not klines_dict:
            raise HTTPException(status_code=503, detail="Unable to fetch market price for closing")
        
        closing_price = float(klines_dict[0]["close"])
        
        # Close the position
        result = paper_trading_service.close_position(position_id, closing_price, db=db)
        
        if not result:
            raise HTTPException(status_code=404, detail="Position not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to close position: {str(e)}")


@router.patch("/position/{position_id}")
async def update_position(
    position_id: str,
    update: PositionUpdateRequest,
    db: Session = Depends(get_db_session)
):
    """
    Modifica SL/TP/Trailing di posizione aperta.
    
    Args:
        position_id: ID of the position to update
        update: Position update parameters
        db: Database session
    
    Returns:
        Updated position details
    """
    try:
        result = paper_trading_service.update_position(
            position_id=position_id,
            stop_loss=update.stop_loss,
            take_profit=update.take_profit,
            trailing_stop_distance=update.trailing_stop_distance,
            trailing_stop_activation_price=update.trailing_stop_activation_price,
            db=db
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Position not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update position: {str(e)}")
