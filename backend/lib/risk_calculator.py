"""
Risk Management Calculator
Position sizing, risk/reward ratio, portfolio risk calculations
"""

from typing import Dict, Optional
from decimal import Decimal, ROUND_DOWN


def calculate_position_size(
    account_balance: float,
    risk_percentage: float,
    entry_price: float,
    stop_loss_price: float,
    leverage: int = 1
) -> Dict[str, float]:
    """
    Calculate optimal position size based on risk parameters

    Args:
        account_balance: Total account balance
        risk_percentage: Risk per trade (e.g., 2 for 2%)
        entry_price: Entry price
        stop_loss_price: Stop-loss price
        leverage: Leverage multiplier (default 1 = no leverage)

    Returns:
        Dict with position_size, risk_amount, quantity, and warnings
    """
    if account_balance <= 0:
        return {"error": "Account balance must be positive"}

    if entry_price <= 0 or stop_loss_price <= 0:
        return {"error":  "Prices must be positive"}

    if risk_percentage <= 0 or risk_percentage > 100:
        return {"error": "Risk percentage must be between 0 and 100"}

    # Calculate risk amount
    risk_amount = account_balance * (risk_percentage / 100)

    # Calculate stop-loss distance (percentage)
    sl_distance_pct = abs((entry_price - stop_loss_price) / entry_price) * 100

    # Calculate position size
    if sl_distance_pct == 0:
        return {"error": "Stop-loss cannot equal entry price"}

    position_size = (risk_amount / (sl_distance_pct / 100)) * leverage

    # Calculate quantity (coins/tokens)
    quantity = position_size / entry_price

    # Calculate max loss
    max_loss = risk_amount

    # Calculate position as % of account
    position_pct = (position_size / account_balance) * 100

    # Generate warnings
    warnings = []
    if position_pct > 50:
        warnings.append("⚠️ Position size exceeds 50% of account - HIGH RISK")
    elif position_pct > 25:
        warnings.append("⚠️ Position size exceeds 25% of account - Consider reducing")

    if sl_distance_pct < 1:
        warnings.append("⚠️ Stop-loss too tight (<1%) - May get stopped out prematurely")
    elif sl_distance_pct > 10:
        warnings.append("⚠️ Stop-loss very wide (>10%) - Consider tighter SL")

    if leverage > 5:
        warnings.append("⚠️ High leverage (>5x) - Risk of liquidation")

    return {
        "position_size": round(position_size, 2),
        "quantity": round(quantity, 8),
        "risk_amount": round(risk_amount, 2),
        "max_loss": round(max_loss, 2),
        "sl_distance_pct": round(sl_distance_pct, 2),
        "position_pct": round(position_pct, 2),
        "leverage": leverage,
        "warnings":  warnings,
        "safe":  len(warnings) == 0
    }


def calculate_risk_reward(
    entry_price: float,
    stop_loss_price:  float,
    take_profit_price: float,
    position_size: Optional[float] = None
) -> Dict[str, float]:
    """
    Calculate risk/reward ratio

    Args:
        entry_price: Entry price
        stop_loss_price: Stop-loss price
        take_profit_price: Take-profit target
        position_size: Position size for P/L calculation (optional)

    Returns:
        Dict with R: R ratio, risk amount, reward amount, projections
    """
    if entry_price <= 0 or stop_loss_price <= 0 or take_profit_price <= 0:
        return {"error":  "All prices must be positive"}

    # Determine if long or short
    is_long = take_profit_price > entry_price

    # Calculate risk (distance to SL)
    risk_distance = abs(entry_price - stop_loss_price)
    risk_pct = (risk_distance / entry_price) * 100

    # Calculate reward (distance to TP)
    reward_distance = abs(take_profit_price - entry_price)
    reward_pct = (reward_distance / entry_price) * 100

    # Calculate R:R ratio
    if risk_distance == 0:
        return {"error": "Stop-loss cannot equal entry price"}

    rr_ratio = reward_distance / risk_distance

    # P/L projections if position size provided
    projections = {}
    if position_size:
        loss_amount = position_size * (risk_pct / 100)
        profit_amount = position_size * (reward_pct / 100)
        projections = {
            "potential_loss": round(loss_amount, 2),
            "potential_profit": round(profit_amount, 2),
            "net_expectation": round(profit_amount - loss_amount, 2)
        }

    # Generate recommendations
    recommendations = []
    if rr_ratio < 1:
        recommendations.append("❌ R:R ratio < 1:1 - Not recommended")
    elif rr_ratio < 2:
        recommendations.append("⚠️ R:R ratio < 1:2 - Consider better setup")
    elif rr_ratio >= 3:
        recommendations.append("✅ Excellent R:R ratio (≥1:3)")
    else:
        recommendations.append("✅ Good R:R ratio (≥1:2)")

    return {
        "rr_ratio": round(rr_ratio, 2),
        "risk_pct": round(risk_pct, 2),
        "reward_pct": round(reward_pct, 2),
        "risk_distance": round(risk_distance, 2),
        "reward_distance": round(reward_distance, 2),
        "direction": "LONG" if is_long else "SHORT",
        **projections,
        "recommendations": recommendations,
        "acceptable": rr_ratio >= 2
    }


def calculate_portfolio_risk(
    account_balance: float,
    positions: list,
    max_risk_pct: float = 10.0
) -> Dict[str, any]:
    """
    Calculate total portfolio risk exposure

    Args:
        account_balance: Total account balance
        positions: List of dicts with 'size' and 'risk_pct'
        max_risk_pct: Maximum acceptable portfolio risk (default 10%)

    Returns:
        Portfolio risk metrics
    """
    if not positions:
        return {
            "total_exposure": 0,
            "total_risk":  0,
            "exposure_pct": 0,
            "risk_pct": 0,
            "position_count": 0,
            "status": "safe",
            "warnings": []
        }

    total_exposure = sum(p.get('size', 0) for p in positions)
    total_risk = sum(p.get('size', 0) * p.get('risk_pct', 0) / 100 for p in positions)

    exposure_pct = (total_exposure / account_balance) * 100 if account_balance > 0 else 0
    risk_pct = (total_risk / account_balance) * 100 if account_balance > 0 else 0

    warnings = []
    status = "safe"

    if exposure_pct > 100:
        warnings.append("🚨 Over-leveraged!  Exposure > 100%")
        status = "critical"
    elif exposure_pct > 75:
        warnings.append("⚠️ High exposure (>75%)")
        status = "warning"

    if risk_pct > max_risk_pct:
        warnings.append(f"🚨 Portfolio risk ({risk_pct:.1f}%) exceeds limit ({max_risk_pct}%)")
        status = "critical"
    elif risk_pct > max_risk_pct * 0.7:
        warnings.append(f"⚠️ Portfolio risk approaching limit")
        status = "warning" if status == "safe" else status

    if len(positions) > 10:
        warnings.append("⚠️ Too many positions (>10) - Hard to manage")

    return {
        "total_exposure": round(total_exposure, 2),
        "total_risk": round(total_risk, 2),
        "exposure_pct": round(exposure_pct, 2),
        "risk_pct": round(risk_pct, 2),
        "position_count": len(positions),
        "max_risk_pct": max_risk_pct,
        "status": status,
        "warnings": warnings
    }
