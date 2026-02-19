"""Order book recorder service for capturing market depth snapshots."""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from binance.client import Client
from binance.exceptions import BinanceAPIException

from backend.config import settings
from backend.lib.database import get_db
from backend.models.orderbook import OrderbookSnapshot
from backend.models.position import Position, PositionStatus

logger = logging.getLogger(__name__)


class OrderbookRecorderService:
    """
    Records order book snapshots periodically.
    Active when:
    - REC flag is enabled, OR
    - There's at least one open paper position
    """

    def __init__(self):
        self.is_recording = False
        self.symbol: Optional[str] = None
        self.task: Optional[asyncio.Task] = None
        self.client: Optional[Client] = None
        self.error_count = 0
        self.max_errors = 5
        self.status = "stopped"  # stopped, recording, error
        self.interval_ms = 500  # 500ms between snapshots

    def _init_client(self):
        """Initialize Binance client lazily."""
        if self.client is None:
            # Use public client (no auth needed for order book)
            self.client = Client("", "")
        return self.client

    def _should_record(self) -> bool:
        """Check if recording should be active based on open positions."""
        try:
            db_gen = get_db()
            db = next(db_gen)
            try:
                # Check if there are any open positions
                open_count = (
                    db.query(Position)
                    .filter(Position.status == PositionStatus.OPEN)
                    .count()
                )
                return open_count > 0
            finally:
                try:
                    next(db_gen)
                except StopIteration:
                    pass
        except Exception as e:
            logger.error(f"Error checking positions: {e}")
            return False

    async def _capture_orderbook(self) -> Optional[Dict[str, Any]]:
        """Capture order book snapshot from Binance."""
        try:
            client = self._init_client()

            # Get order book depth (limit=20 for top 20 levels)
            depth = client.get_order_book(symbol=self.symbol, limit=20)

            # Format bids and asks
            bids = [{"price": bid[0], "qty": bid[1]} for bid in depth.get("bids", [])]
            asks = [{"price": ask[0], "qty": ask[1]} for ask in depth.get("asks", [])]

            return {
                "symbol": self.symbol,
                "timestamp": datetime.now(timezone.utc),
                "bids": bids,
                "asks": asks,
                "source": "binance_rest",
            }
        except BinanceAPIException as e:
            logger.error(f"Binance API error capturing orderbook: {e}")
            self.error_count += 1
            return None
        except Exception as e:
            logger.error(f"Error capturing orderbook: {e}")
            self.error_count += 1
            return None

    def _save_snapshot(self, snapshot_data: Dict[str, Any]):
        """Save snapshot to database."""
        try:
            db_gen = get_db()
            db = next(db_gen)
            try:
                snapshot = OrderbookSnapshot(**snapshot_data)
                db.add(snapshot)
                db.commit()
                logger.debug(f"Saved orderbook snapshot for {snapshot_data['symbol']}")
            finally:
                try:
                    next(db_gen)
                except StopIteration:
                    pass
        except Exception as e:
            logger.error(f"Error saving snapshot: {e}")

    async def _recording_loop(self):
        """Main recording loop."""
        logger.info(f"Starting orderbook recording for {self.symbol}")
        self.status = "recording"
        self.error_count = 0

        while self.is_recording:
            try:
                # Check if we should still be recording based on positions (only if not manually enabled)
                # Manual recording (via is_recording flag) takes precedence
                has_open_positions = self._should_record()

                if not has_open_positions:
                    logger.debug("No open positions detected (auto-recording check)")

                # Capture snapshot
                snapshot = await self._capture_orderbook()

                if snapshot:
                    self._save_snapshot(snapshot)
                    self.error_count = 0  # Reset on success

                # Check error threshold
                if self.error_count >= self.max_errors:
                    logger.error(
                        f"Max errors reached ({self.max_errors}), stopping recorder"
                    )
                    self.status = "error"
                    self.is_recording = False
                    break

                # Wait before next capture
                await asyncio.sleep(self.interval_ms / 1000.0)

            except asyncio.CancelledError:
                logger.info("Recording task cancelled")
                break
            except Exception as e:
                logger.error(f"Unexpected error in recording loop: {e}")
                self.error_count += 1
                if self.error_count >= self.max_errors:
                    self.status = "error"
                    self.is_recording = False
                    break
                await asyncio.sleep(1)

        self.status = "stopped"
        logger.info("Orderbook recording stopped")

    def start_recording(self, symbol: str) -> Dict[str, Any]:
        """Start recording order book snapshots."""
        if self.is_recording:
            return {
                "success": False,
                "message": f"Already recording for {self.symbol}",
                "status": self.status,
            }

        self.symbol = symbol.upper()
        self.is_recording = True
        self.error_count = 0

        # Start async task
        loop = asyncio.get_event_loop()
        self.task = loop.create_task(self._recording_loop())

        logger.info(f"Started orderbook recording for {self.symbol}")
        return {
            "success": True,
            "message": f"Recording started for {self.symbol}",
            "status": "recording",
        }

    def stop_recording(self) -> Dict[str, Any]:
        """Stop recording order book snapshots."""
        if not self.is_recording:
            return {
                "success": False,
                "message": "Not currently recording",
                "status": self.status,
            }

        self.is_recording = False

        if self.task and not self.task.done():
            self.task.cancel()

        logger.info(f"Stopped orderbook recording for {self.symbol}")
        return {
            "success": True,
            "message": "Recording stopped",
            "status": "stopped",
        }

    def get_status(self) -> Dict[str, Any]:
        """Get current recording status."""
        return {
            "is_recording": self.is_recording,
            "symbol": self.symbol,
            "status": self.status,
            "error_count": self.error_count,
            "interval_ms": self.interval_ms,
        }


# Global singleton instance
orderbook_recorder = OrderbookRecorderService()
