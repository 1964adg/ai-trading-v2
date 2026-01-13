import asyncio
import logging
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class TrailingStopService:
    """Monitor and update trailing stops."""

    def __init__(self):
        self.running = False

        # Poll attivo (quando ci sono trailing stop)
        self.check_interval = 5  # seconds

        # Poll idle (quando NON ci sono trailing stop)
        self.idle_interval = 10  # seconds

        # evita overlap: un ciclo alla volta
        self._loop_lock = asyncio.Lock()

        # backoff in caso di errori DB/pool
        self._error_sleep = 1  # seconds
        self._error_sleep_max = 30  # seconds

    async def start(self):
        """Start monitoring trailing stops."""
        if self.running:
            return
        self.running = True
        logger.info("Trailing stop service started")
        asyncio.create_task(self._monitor_loop())

    async def stop(self):
        """Stop monitoring."""
        self.running = False
        logger.info("Trailing stop service stopped")

    async def _monitor_loop(self):
        """Main monitoring loop."""
        while self.running:
            # non accumulare task: un solo giro per volta
            if self._loop_lock.locked():
                await asyncio.sleep(self.check_interval)
                continue

            try:
                async with self._loop_lock:
                    from lib.database import get_db

                    with get_db() as db:
                        # ritorna quanti trailing stop ha processato
                        processed = await self._check_trailing_stops(db)

                # reset backoff dopo giro ok
                self._error_sleep = 1

                # sleep dinamico: se non c'è nulla da fare, dormi di più
                await asyncio.sleep(
                    self.idle_interval if processed == 0 else self.check_interval
                )

            except Exception as e:
                logger.error(f"Error in trailing stop monitoring: {e}")

                # backoff progressivo (1s, 2s, 4s... max 30s)
                await asyncio.sleep(self._error_sleep)
                self._error_sleep = min(self._error_sleep * 2, self._error_sleep_max)

    async def _check_trailing_stops(self, db: Session) -> int:
        """Check all positions with trailing stops. Returns processed count."""
        from models.position import Position, PositionStatus, PositionSide
        from services.binance_service import binance_service
        from services.paper_trading_service import paper_trading_service

        positions = (
            db.query(Position)
            .filter(
                Position.status == PositionStatus.OPEN,
                Position.trailing_stop_distance.isnot(None),
            )
            .all()
        )

        if not positions:
            return 0

        updated_any = False

        for position in positions:
            try:
                # ✅ evita blocco event-loop: chiama funzione sync in thread
                klines = await asyncio.to_thread(
                    binance_service.get_klines_data,
                    symbol=position.symbol,
                    interval="1m",
                    limit=1,
                )

                if klines is None or (hasattr(klines, "empty") and klines.empty):
                    continue

                klines_list = klines.to_dict("records")
                if not klines_list:
                    continue

                current_price = float(klines_list[0]["close"])

                # Activation check
                if position.trailing_stop_activation_price:
                    if position.side == PositionSide.BUY:
                        if current_price < position.trailing_stop_activation_price:
                            continue
                    else:
                        if current_price > position.trailing_stop_activation_price:
                            continue

                distance_pct = position.trailing_stop_distance / 100

                if position.side == PositionSide.BUY:
                    new_stop_loss = current_price * (1 - distance_pct)

                    if not position.stop_loss or new_stop_loss > position.stop_loss:
                        position.stop_loss = new_stop_loss
                        updated_any = True

                    if position.stop_loss and current_price <= position.stop_loss:
                        logger.info(f"Trailing stop triggered for {position.symbol}")
                        paper_trading_service.close_position(
                            position.id, current_price, db
                        )

                else:  # SELL
                    new_stop_loss = current_price * (1 + distance_pct)

                    if not position.stop_loss or new_stop_loss < position.stop_loss:
                        position.stop_loss = new_stop_loss
                        updated_any = True

                    if position.stop_loss and current_price >= position.stop_loss:
                        logger.info(f"Trailing stop triggered for {position.symbol}")
                        paper_trading_service.close_position(
                            position.id, current_price, db
                        )

            except Exception as e:
                logger.error(f"Error processing trailing stop for {position.id}: {e}")

        # ✅ un commit solo a fine giro (se abbiamo aggiornato qualcosa)
        if updated_any:
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise

        return len(positions)


# Singleton
trailing_stop_service = TrailingStopService()
