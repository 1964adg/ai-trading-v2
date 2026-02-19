"""Advanced orders API endpoints for paper trading."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from backend.services.advanced_orders_service import advanced_orders_service
from backend.services.order_monitoring_service import order_monitoring_service
from backend.services.binance_service import binance_service

router = APIRouter()


class OCOOrderRequest(BaseModel):
    """OCO order request model."""

    symbol: str = Field(..., description="Trading pair symbol (e.g., BTCUSDT)")
    side: str = Field(..., description="Order side: 'BUY' or 'SELL'")
    quantity: float = Field(..., gt=0, description="Order quantity")
    order1: Dict[str, Any] = Field(..., description="First order leg")
    order2: Dict[str, Any] = Field(..., description="Second order leg")


class BracketOrderRequest(BaseModel):
    """Bracket order request model."""

    symbol: str = Field(..., description="Trading pair symbol (e.g., BTCUSDT)")
    side: str = Field(..., description="Order side: 'BUY' or 'SELL'")
    quantity: float = Field(..., gt=0, description="Order quantity")
    entry_order: Dict[str, Any] = Field(..., description="Entry order configuration")
    stop_loss: Dict[str, Any] = Field(..., description="Stop loss configuration")
    take_profit: Dict[str, Any] = Field(..., description="Take profit configuration")


class TrailingStopOrderRequest(BaseModel):
    """Trailing stop order request model."""

    symbol: str = Field(..., description="Trading pair symbol (e.g., BTCUSDT)")
    side: str = Field(..., description="Order side: 'BUY' or 'SELL'")
    quantity: float = Field(..., gt=0, description="Order quantity")
    trail_amount: Optional[float] = Field(None, description="Fixed trail amount")
    trail_percent: Optional[float] = Field(None, description="Percentage trail (0-100)")
    activation_price: Optional[float] = Field(
        None, description="Price to activate trailing"
    )


class IcebergOrderRequest(BaseModel):
    """Iceberg order request model."""

    symbol: str = Field(..., description="Trading pair symbol (e.g., BTCUSDT)")
    side: str = Field(..., description="Order side: 'BUY' or 'SELL'")
    total_quantity: float = Field(..., gt=0, description="Total order quantity")
    display_quantity: float = Field(..., gt=0, description="Display quantity per slice")
    randomize_slices: bool = Field(False, description="Randomize slice sizes")
    time_interval: int = Field(1000, description="Time interval between slices (ms)")


@router.post("/advanced-order/oco")
async def create_oco_order(order: OCOOrderRequest):
    """
    Create an OCO (One-Cancels-Other) order.

    Args:
        order: OCO order request with two order legs

    Returns:
        Created OCO order details
    """
    try:
        # Validate order side
        if order.side.upper() not in ["BUY", "SELL"]:
            raise HTTPException(
                status_code=400, detail="Order side must be 'BUY' or 'SELL'"
            )

        # Create OCO order
        oco_order = advanced_orders_service.create_oco_order(
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            order1=order.order1,
            order2=order.order2,
        )

        # Get current price for monitoring
        try:
            klines = binance_service.get_klines_data(
                symbol=order.symbol.upper(), interval="1m", limit=1
            )
            if klines:
                current_price = klines[0]["close"]
                order_monitoring_service.update_market_price(
                    order.symbol.upper(), current_price
                )
        except Exception as e:
            pass  # Non-critical, monitoring will catch up

        return {
            "success": True,
            "order": advanced_orders_service._oco_to_dict(oco_order),
            "message": "OCO order created successfully",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create OCO order: {str(e)}"
        )


@router.post("/advanced-order/bracket")
async def create_bracket_order(order: BracketOrderRequest):
    """
    Create a Bracket order (entry + stop loss + take profit).

    Args:
        order: Bracket order request with entry, SL, and TP

    Returns:
        Created Bracket order details
    """
    try:
        # Validate order side
        if order.side.upper() not in ["BUY", "SELL"]:
            raise HTTPException(
                status_code=400, detail="Order side must be 'BUY' or 'SELL'"
            )

        # Get current price if needed for market entry
        current_price = None
        if order.entry_order.get("order_type") == "MARKET":
            try:
                klines = binance_service.get_klines_data(
                    symbol=order.symbol.upper(), interval="1m", limit=1
                )
                if klines:
                    current_price = klines[0]["close"]
                    order.entry_order["price"] = current_price
            except Exception as e:
                raise HTTPException(
                    status_code=503, detail=f"Unable to fetch market price: {str(e)}"
                )

        # Create bracket order
        bracket_order = advanced_orders_service.create_bracket_order(
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            entry_order=order.entry_order,
            stop_loss=order.stop_loss,
            take_profit=order.take_profit,
        )

        # Update monitoring if we have current price
        if current_price:
            order_monitoring_service.update_market_price(
                order.symbol.upper(), current_price
            )

        return {
            "success": True,
            "order": advanced_orders_service._bracket_to_dict(bracket_order),
            "message": "Bracket order created successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create Bracket order: {str(e)}"
        )


@router.post("/advanced-order/trailing-stop")
async def create_trailing_stop_order(order: TrailingStopOrderRequest):
    """
    Create an Advanced Trailing Stop order.

    Args:
        order: Trailing stop order request

    Returns:
        Created Trailing Stop order details
    """
    try:
        # Validate order side
        if order.side.upper() not in ["BUY", "SELL"]:
            raise HTTPException(
                status_code=400, detail="Order side must be 'BUY' or 'SELL'"
            )

        # Validate trailing parameters
        if not order.trail_amount and not order.trail_percent:
            raise HTTPException(
                status_code=400,
                detail="Must specify either trail_amount or trail_percent",
            )

        # Get current price
        try:
            klines = binance_service.get_klines_data(
                symbol=order.symbol.upper(), interval="1m", limit=1
            )
            if not klines:
                raise HTTPException(
                    status_code=503, detail="Unable to fetch market price"
                )
            current_price = klines[0]["close"]
        except Exception as e:
            raise HTTPException(
                status_code=503, detail=f"Unable to fetch market price: {str(e)}"
            )

        # Create trailing stop order
        trailing_order = advanced_orders_service.create_trailing_stop_order(
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            trail_amount=order.trail_amount,
            trail_percent=order.trail_percent,
            activation_price=order.activation_price,
            current_price=current_price,
        )

        # Initialize monitoring
        order_monitoring_service.update_market_price(
            order.symbol.upper(), current_price
        )

        return {
            "success": True,
            "order": advanced_orders_service._trailing_stop_to_dict(trailing_order),
            "message": "Trailing Stop order created successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create Trailing Stop order: {str(e)}"
        )


@router.post("/advanced-order/iceberg")
async def create_iceberg_order(order: IcebergOrderRequest):
    """
    Create an Iceberg order (hidden quantity execution).

    Args:
        order: Iceberg order request

    Returns:
        Created Iceberg order details
    """
    try:
        # Validate order side
        if order.side.upper() not in ["BUY", "SELL"]:
            raise HTTPException(
                status_code=400, detail="Order side must be 'BUY' or 'SELL'"
            )

        # Validate quantities
        if order.display_quantity > order.total_quantity:
            raise HTTPException(
                status_code=400, detail="Display quantity cannot exceed total quantity"
            )

        # Create iceberg order
        iceberg_order = advanced_orders_service.create_iceberg_order(
            symbol=order.symbol,
            side=order.side,
            total_quantity=order.total_quantity,
            display_quantity=order.display_quantity,
            randomize_slices=order.randomize_slices,
            time_interval=order.time_interval,
        )

        # Get current price for monitoring
        try:
            klines = binance_service.get_klines_data(
                symbol=order.symbol.upper(), interval="1m", limit=1
            )
            if klines:
                current_price = klines[0]["close"]
                order_monitoring_service.update_market_price(
                    order.symbol.upper(), current_price
                )
        except Exception as e:
            pass  # Non-critical

        return {
            "success": True,
            "order": advanced_orders_service._iceberg_to_dict(iceberg_order),
            "message": "Iceberg order created successfully",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create Iceberg order: {str(e)}"
        )


@router.get("/advanced-orders")
async def get_advanced_orders():
    """
    Get all advanced orders.

    Returns:
        All active advanced orders grouped by type
    """
    try:
        orders = advanced_orders_service.get_all_orders()
        return {"success": True, "orders": orders}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch advanced orders: {str(e)}"
        )


@router.delete("/advanced-order/{order_id}")
async def cancel_advanced_order(order_id: str):
    """
    Cancel an advanced order.

    Args:
        order_id: ID of the order to cancel

    Returns:
        Cancellation status
    """
    try:
        success = advanced_orders_service.cancel_order(order_id)

        if not success:
            raise HTTPException(status_code=404, detail="Order not found")

        return {"success": True, "message": f"Order {order_id} cancelled successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel order: {str(e)}")


@router.post("/advanced-orders/update-prices")
async def update_order_prices():
    """
    Update market prices for all monitored orders.
    This endpoint can be called periodically to trigger order monitoring.

    Returns:
        Update status
    """
    try:
        # Get all unique symbols from active orders
        all_orders = advanced_orders_service.get_all_orders()
        symbols = set()

        for order_type in all_orders.values():
            for order in order_type:
                if order.get("status") in ["ACTIVE", "PENDING", "PARTIALLY_FILLED"]:
                    symbols.add(order["symbol"])

        # Update prices for each symbol
        for symbol in symbols:
            try:
                klines = binance_service.get_klines_data(
                    symbol=symbol, interval="1m", limit=1
                )
                if klines:
                    current_price = klines[0]["close"]
                    order_monitoring_service.update_market_price(symbol, current_price)
            except Exception as e:
                # Log error but continue with other symbols
                pass

        return {
            "success": True,
            "symbols_updated": len(symbols),
            "message": "Market prices updated successfully",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update prices: {str(e)}"
        )
