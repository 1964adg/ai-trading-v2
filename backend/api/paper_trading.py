"""Paper trading API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from services.paper_trading_service import paper_trading_service
from services.binance_service import binance_service

router = APIRouter()


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


@router.post("/order")
async def create_paper_order(order: OrderRequest):
    """
    Create a paper trading order.
    
    Args:
        order: Order request with type, symbol, quantity, and optional price
        
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
                if klines:
                    execution_price = klines[0]["close"]
                else:
                    raise HTTPException(status_code=503, detail="Unable to fetch market price")
            except Exception as e:
                raise HTTPException(status_code=503, detail=f"Unable to fetch market price: {str(e)}")
        
        # Create the order
        result = paper_trading_service.create_order(
            order_type=order.side.lower(),
            symbol=order.symbol.upper(),
            quantity=order.quantity,
            price=execution_price
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.get("/positions")
async def get_paper_positions():
    """
    Get all active paper trading positions.
    
    Returns:
        List of active positions with current P&L
    """
    try:
        positions = paper_trading_service.get_positions()
        
        # Update current prices and P&L for each position
        for position in positions:
            try:
                # Fetch current market price
                klines = binance_service.get_klines_data(
                    symbol=position["symbol"],
                    interval="1m",
                    limit=1
                )
                if klines:
                    current_price = klines[0]["close"]
                    position["current_price"] = current_price
                    
                    # Calculate P&L
                    if position["type"] == "buy":
                        position["current_pnl"] = (current_price - position["entry_price"]) * position["quantity"]
                    else:  # sell
                        position["current_pnl"] = (position["entry_price"] - current_price) * position["quantity"]
                    
                    # Update in service
                    paper_trading_service.update_position_price(position["id"], current_price)
            except Exception as e:
                print(f"[WARNING] Failed to update price for {position['symbol']}: {e}")
                # Keep the position with last known values
        
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
async def close_paper_position(position_id: str):
    """
    Close a paper trading position.
    
    Args:
        position_id: ID of the position to close
        
    Returns:
        Closed position details with realized P&L
    """
    try:
        # Get position to find symbol
        positions = paper_trading_service.get_positions()
        position = next((p for p in positions if p["id"] == position_id), None)
        
        if not position:
            raise HTTPException(status_code=404, detail="Position not found")
        
        # Fetch current market price for closing
        klines = binance_service.get_klines_data(
            symbol=position["symbol"],
            interval="1m",
            limit=1
        )
        
        if not klines:
            raise HTTPException(status_code=503, detail="Unable to fetch market price for closing")
        
        closing_price = klines[0]["close"]
        
        # Close the position
        result = paper_trading_service.close_position(position_id, closing_price)
        
        if not result:
            raise HTTPException(status_code=404, detail="Position not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to close position: {str(e)}")
