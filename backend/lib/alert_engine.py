"""
User-defined alert engine.
Manages personalized price and indicator alerts.
Completely separate from Scout alerts.
"""

import json
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


class UserAlertType(str, Enum):
    """User alert types - separate from Scout AlertType"""
    PRICE_ABOVE = "PRICE_ABOVE"
    PRICE_BELOW = "PRICE_BELOW"
    RSI_THRESHOLD = "RSI_THRESHOLD"
    MACD_SIGNAL = "MACD_SIGNAL"
    VOLUME_SPIKE = "VOLUME_SPIKE"


class UserAlertStatus(str, Enum):
    """Alert status"""
    ACTIVE = "ACTIVE"
    TRIGGERED = "TRIGGERED"
    EXPIRED = "EXPIRED"
    DISABLED = "DISABLED"


class UserAlert(BaseModel):
    """User-defined alert"""
    id: str
    user_id: str = Field(default="default_user")
    symbol: str
    alert_type:  UserAlertType
    condition: Dict[str, Any]
    message: str
    status: UserAlertStatus = UserAlertStatus.ACTIVE
    enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    triggered_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    repeat:  bool = False


class AlertEngine:
    """User alert engine - separate from Scout AlertManager"""

    def __init__(self, db_path: str = "backend/db/user_alerts.json"):
        self.db_path = db_path
        self.alerts:  List[UserAlert] = []
        self._ensure_db_exists()
        self.load_alerts()

    def _ensure_db_exists(self):
        """Create database file if it doesn't exist"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        if not os.path.exists(self.db_path):
            with open(self.db_path, 'w') as f:
                json.dump([], f)
            logger.info(f"Created user alerts database: {self.db_path}")

    def load_alerts(self):
        """Load alerts from JSON file"""
        try:
            with open(self.db_path, 'r') as f:
                data = json.load(f)
                self.alerts = [UserAlert(**alert) for alert in data]
            logger.info(f"Loaded {len(self.alerts)} user alerts")
        except Exception as e:
            logger.error(f"Error loading alerts: {e}")
            self.alerts = []

    def save_alerts(self):
        """Save alerts to JSON file"""
        try:
            with open(self.db_path, 'w') as f:
                data = [alert.dict() for alert in self.alerts]
                json.dump(data, f, indent=2, default=str)
            logger.debug(f"Saved {len(self.alerts)} user alerts")
        except Exception as e:
            logger.error(f"Error saving alerts: {e}")

    def create_alert(self, alert:  UserAlert) -> UserAlert:
        """Create new alert"""
        self.alerts.append(alert)
        self.save_alerts()
        logger.info(f"Created user alert: {alert.id} for {alert.symbol}")
        return alert

    def get_alerts(self, user_id: str = "default_user", active_only: bool = False) -> List[UserAlert]:
        """Get user alerts"""
        alerts = [a for a in self.alerts if a.user_id == user_id]
        if active_only:
            alerts = [a for a in alerts if a.status == UserAlertStatus.ACTIVE and a.enabled]
        return alerts

    def get_alert(self, alert_id: str) -> Optional[UserAlert]:
        """Get alert by ID"""
        for alert in self.alerts:
            if alert.id == alert_id:
                return alert
        return None

    def update_alert(self, alert_id: str, updates: Dict[str, Any]) -> Optional[UserAlert]:
        """Update alert"""
        alert = self.get_alert(alert_id)
        if not alert:
            return None

        for key, value in updates.items():
            if hasattr(alert, key):
                setattr(alert, key, value)

        self.save_alerts()
        logger.info(f"Updated alert: {alert_id}")
        return alert

    def delete_alert(self, alert_id: str) -> bool:
        """Delete alert"""
        initial_count = len(self.alerts)
        self.alerts = [a for a in self.alerts if a.id != alert_id]

        if len(self.alerts) < initial_count:
            self.save_alerts()
            logger.info(f"Deleted alert:  {alert_id}")
            return True
        return False

    def toggle_alert(self, alert_id: str, enabled:  bool) -> Optional[UserAlert]:
        """Enable/disable alert"""
        return self.update_alert(alert_id, {"enabled": enabled})

    async def check_alerts(self, market_data: Dict[str, Any]) -> List[UserAlert]:
        """Check all active alerts against current market data"""
        triggered = []

        for alert in self.alerts:
            if not alert.enabled or alert.status != UserAlertStatus.ACTIVE:
                continue

            # Check expiration
            if alert.expires_at and datetime.utcnow() > alert.expires_at:
                alert.status = UserAlertStatus.EXPIRED
                continue

            symbol_data = market_data.get(alert.symbol)
            if not symbol_data:
                continue

            # Check condition
            if self._check_condition(alert, symbol_data):
                alert.status = UserAlertStatus.TRIGGERED
                alert.triggered_at = datetime.utcnow()
                triggered.append(alert)
                logger.info(f"🔔 Alert triggered: {alert.message}")

                # Reset if repeat enabled
                if alert.repeat:
                    alert.status = UserAlertStatus.ACTIVE
                    alert.triggered_at = None

        if triggered:
            self.save_alerts()

        return triggered

    def _check_condition(self, alert: UserAlert, data: Dict[str, Any]) -> bool:
        """Check if alert condition is met"""
        try:
            condition = alert.condition
            alert_type = alert.alert_type

            if alert_type == UserAlertType.PRICE_ABOVE:
                return data.get('price', 0) > condition.get('threshold', 0)

            elif alert_type == UserAlertType.PRICE_BELOW:
                return data.get('price', 0) < condition.get('threshold', 0)

            elif alert_type == UserAlertType.RSI_THRESHOLD:
                rsi = data.get('rsi', 50)
                threshold = condition.get('threshold', 50)
                comparison = condition.get('comparison', 'above')
                return rsi > threshold if comparison == 'above' else rsi < threshold

            elif alert_type == UserAlertType.MACD_SIGNAL:
                signal = data.get('macd_signal', 'NEUTRAL')
                target = condition.get('target_signal', 'BUY')
                return signal == target

            elif alert_type == UserAlertType.VOLUME_SPIKE:
                volume_ratio = data.get('volume_ratio', 1.0)
                threshold = condition.get('threshold', 2.0)
                return volume_ratio > threshold

            return False

        except Exception as e:
            logger.error(f"Error checking condition for alert {alert.id}: {e}")
            return False


# Global instance
alert_engine = AlertEngine()
