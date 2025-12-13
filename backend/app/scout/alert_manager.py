"""
Alert Manager for Crypto Scout
Handles alert configuration, triggering, and notifications
"""
import logging
import uuid
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from collections import deque

from app.scout.models import (
    Alert, AlertType, AlertConfig, AlertHistory,
    Opportunity, Signal
)

logger = logging.getLogger(__name__)


class AlertManager:
    """Manages alerts and notifications for crypto scout"""
    
    def __init__(self):
        self.config = AlertConfig()
        self.alerts: deque = deque(maxlen=100)  # Keep last 100 alerts
        self.last_alert_time: Dict[str, datetime] = {}
        
    def configure(self, config: AlertConfig):
        """Update alert configuration"""
        self.config = config
        logger.info(f"Alert config updated: {config.dict()}")
    
    def get_config(self) -> AlertConfig:
        """Get current configuration"""
        return self.config
    
    def check_opportunity(self, opportunity: Opportunity) -> List[Alert]:
        """
        Check if opportunity triggers any alerts
        
        Args: 
            opportunity:  Opportunity to check
            
        Returns: 
            List of triggered alerts
        """
        if not self.config.enabled:
            return []
        
        triggered_alerts = []
        
        # Check high score alert
        if opportunity.score.total >= self.config.min_score_threshold:
            alert = self._create_alert(
                alert_type=AlertType.HIGH_SCORE,
                symbol=opportunity.symbol,
                message=f"High score detected: {opportunity.score.total}/100",
                score=opportunity.score.total,
                price=opportunity.price,
                opportunity=opportunity
            )
            triggered_alerts.append(alert)
        
        # Check volume spike
        if opportunity.volume_change >= self.config.volume_spike_threshold:
            alert = self._create_alert(
                alert_type=AlertType.VOLUME_SPIKE,
                symbol=opportunity.symbol,
                message=f"Volume spike:  +{opportunity.volume_change:.1f}%",
                volume_change=opportunity.volume_change,
                price=opportunity.price,
                opportunity=opportunity
            )
            triggered_alerts.append(alert)
        
        # Check price breakout
        if abs(opportunity.change_24h) >= self.config.price_change_threshold:
            direction = "up" if opportunity.change_24h > 0 else "down"
            alert = self._create_alert(
                alert_type=AlertType.PRICE_BREAKOUT,
                symbol=opportunity.symbol,
                message=f"Price breakout {direction}: {opportunity.change_24h:+.2f}%",
                price=opportunity.price,
                opportunity=opportunity
            )
            triggered_alerts.append(alert)
        
        # Check STRONG_BUY signal
        if opportunity.signal == Signal.STRONG_BUY: 
            alert = self._create_alert(
                alert_type=AlertType.STRONG_BUY_SIGNAL,
                symbol=opportunity.symbol,
                message=f"STRONG BUY signal detected!  Score: {opportunity.score.total}",
                score=opportunity.score.total,
                price=opportunity.price,
                opportunity=opportunity
            )
            triggered_alerts.append(alert)
        
        # Add alerts and send notifications
        for alert in triggered_alerts:
            self._add_alert(alert)
            self._send_notification(alert)
        
        return triggered_alerts
    
    def _create_alert(
        self,
        alert_type: AlertType,
        symbol: str,
        message: str,
        score: Optional[float] = None,
        price: Optional[float] = None,
        volume_change: Optional[float] = None,
        opportunity: Optional[Opportunity] = None
    ) -> Alert:
        """Create a new alert"""
        
        # Rate limiting:  don't alert same symbol too frequently
        alert_key = f"{symbol}:{alert_type}"
        now = datetime.utcnow()
        
        if alert_key in self.last_alert_time:
            time_since_last = (now - self.last_alert_time[alert_key]).total_seconds()
            if time_since_last < 300:  # 5 minutes cooldown
                logger.debug(f"Alert rate limited:  {alert_key} (last {time_since_last:.0f}s ago)")
                return None
        
        self.last_alert_time[alert_key] = now
        
        return Alert(
            id=str(uuid.uuid4()),
            alert_type=alert_type,
            symbol=symbol,
            message=message,
            score=score,
            price=price,
            volume_change=volume_change,
            opportunity=opportunity,
            timestamp=now,
            acknowledged=False
        )
    
    def _add_alert(self, alert: Alert):
        """Add alert to history"""
        if alert: 
            self.alerts.append(alert)
            logger.info(f"🚨 ALERT: {alert.message} [{alert.symbol}]")
    
    def _send_notification(self, alert: Alert):
        """Send notification via configured channels"""
        if not alert: 
            return
        
        for channel in self.config.notification_channels:
            try:
                if channel == "console":
                    self._notify_console(alert)
                elif channel == "webhook":
                    self._notify_webhook(alert)
                elif channel == "email": 
                    self._notify_email(alert)
                else:
                    logger.warning(f"Unknown notification channel: {channel}")
            except Exception as e: 
                logger.error(f"Notification error ({channel}): {e}")
    
    def _notify_console(self, alert: Alert):
        """Log alert to console"""
        emoji_map = {
            AlertType.HIGH_SCORE: "🎯",
            AlertType.VOLUME_SPIKE: "📊",
            AlertType.PRICE_BREAKOUT: "🚀",
            AlertType.STRONG_BUY_SIGNAL: "💰"
        }
        emoji = emoji_map.get(alert.alert_type, "🔔")
        logger.warning(f"{emoji} {alert.alert_type.value}:  {alert.message} | {alert.symbol} @ ${alert.price}")
    
    def _notify_webhook(self, alert: Alert):
        """Send webhook notification (Discord/Telegram/Slack)"""
        # TODO: Implement webhook notifications
        # This would call external services like Discord webhooks
        logger.info(f"Webhook notification: {alert.message}")
        pass
    
    def _notify_email(self, alert: Alert):
        """Send email notification"""
        # TODO: Implement email notifications
        logger.info(f"Email notification: {alert.message}")
        pass
    
    def get_history(
        self,
        limit: Optional[int] = None,
        unacknowledged_only: bool = False
    ) -> AlertHistory:
        """Get alert history"""
        
        alerts_list = list(self.alerts)
        
        if unacknowledged_only: 
            alerts_list = [a for a in alerts_list if not a.acknowledged]
        
        if limit:
            alerts_list = alerts_list[-limit:]
        
        unacknowledged_count = sum(1 for a in self.alerts if not a.acknowledged)
        
        return AlertHistory(
            total_alerts=len(self.alerts),
            unacknowledged_count=unacknowledged_count,
            alerts=alerts_list
        )
    
    def acknowledge_alert(self, alert_id: str) -> bool:
        """Mark alert as acknowledged"""
        for alert in self.alerts:
            if alert.id == alert_id:
                alert.acknowledged = True
                logger.info(f"Alert acknowledged: {alert_id}")
                return True
        return False
    
    def clear_history(self):
        """Clear alert history"""
        self.alerts.clear()
        self.last_alert_time.clear()
        logger.info("Alert history cleared")


# Global instance
alert_manager = AlertManager()