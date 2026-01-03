"""
Backtesting Engine
Test trading strategies on historical data
"""

from typing import List, Dict, Optional, Literal
from dataclasses import dataclass
from datetime import datetime
import numpy as np
import pandas as pd


@dataclass
class Trade:
    """Single trade record"""
    entry_time: datetime
    exit_time:  datetime
    entry_price: float
    exit_price: float
    quantity: float
    side: Literal['long', 'short']
    pnl: float
    pnl_percent: float
    fees: float
    result:  Literal['win', 'loss']


@dataclass
class BacktestResult:
    """Backtest performance metrics"""
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    total_pnl: float
    total_pnl_percent: float
    avg_win:  float
    avg_loss: float
    largest_win: float
    largest_loss: float
    profit_factor: float
    sharpe_ratio: float
    max_drawdown: float
    max_drawdown_percent: float
    total_fees: float
    equity_curve: List[Dict]
    trades: List[Dict]
    strategy_name: str
    symbol: str
    timeframe: str
    start_date: str
    end_date: str
    initial_capital: float
    final_capital: float


class Strategy:
    """Base strategy class"""

    def __init__(self, name: str):
        self.name = name

    def should_enter_long(self, data: pd.DataFrame, index: int) -> bool:
        """Override this method to define long entry logic"""
        raise NotImplementedError

    def should_enter_short(self, data: pd.DataFrame, index: int) -> bool:
        """Override this method to define short entry logic"""
        raise NotImplementedError

    def should_exit(self, data: pd.DataFrame, index: int, entry_price: float, side: str) -> bool:
        """Override this method to define exit logic"""
        raise NotImplementedError


class SimpleMAStrategy(Strategy):
    """Simple Moving Average Crossover Strategy"""

    def __init__(self, fast_period: int = 9, slow_period: int = 21, stop_loss_pct: float = 2.0, take_profit_pct: float = 4.0):
        super().__init__(f"MA_Cross_{fast_period}_{slow_period}")
        self.fast_period = fast_period
        self.slow_period = slow_period
        self.stop_loss_pct = stop_loss_pct
        self.take_profit_pct = take_profit_pct

    def should_enter_long(self, data: pd.DataFrame, index: int) -> bool:
        if index < self.slow_period:
            return False

        fast_ma = data['close'].iloc[index - self.fast_period:index].mean()
        slow_ma = data['close'].iloc[index - self.slow_period:index].mean()

        prev_fast = data['close'].iloc[index - self.fast_period - 1:index - 1].mean()
        prev_slow = data['close'].iloc[index - self.slow_period - 1:index - 1].mean()

        # Crossover:  fast crosses above slow
        return prev_fast <= prev_slow and fast_ma > slow_ma

    def should_enter_short(self, data: pd.DataFrame, index: int) -> bool:
        if index < self.slow_period:
            return False

        fast_ma = data['close'].iloc[index - self.fast_period:index].mean()
        slow_ma = data['close'].iloc[index - self.slow_period:index].mean()

        prev_fast = data['close'].iloc[index - self.fast_period - 1:index - 1].mean()
        prev_slow = data['close'].iloc[index - self.slow_period - 1:index - 1].mean()

        # Crossover: fast crosses below slow
        return prev_fast >= prev_slow and fast_ma < slow_ma

    def should_exit(self, data: pd.DataFrame, index: int, entry_price: float, side: str) -> bool:
        current_price = data['close'].iloc[index]

        if side == 'long':
            pnl_pct = ((current_price - entry_price) / entry_price) * 100
            return pnl_pct <= -self.stop_loss_pct or pnl_pct >= self.take_profit_pct
        else:  # short
            pnl_pct = ((entry_price - current_price) / entry_price) * 100
            return pnl_pct <= -self.stop_loss_pct or pnl_pct >= self.take_profit_pct


class RSIStrategy(Strategy):
    """RSI-based Strategy"""

    def __init__(self, period: int = 14, oversold: int = 30, overbought: int = 70, stop_loss_pct: float = 2.0):
        super().__init__(f"RSI_{period}_{oversold}_{overbought}")
        self.period = period
        self.oversold = oversold
        self.overbought = overbought
        self.stop_loss_pct = stop_loss_pct

    def calculate_rsi(self, data:  pd.DataFrame, index: int) -> Optional[float]:
        if index < self.period:
            return None

        closes = data['close'].iloc[index - self.period:index + 1]
        delta = closes.diff()

        gain = delta.where(delta > 0, 0).mean()
        loss = -delta.where(delta < 0, 0).mean()

        if loss == 0:
            return 100

        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

    def should_enter_long(self, data: pd.DataFrame, index: int) -> bool:
        rsi = self.calculate_rsi(data, index)
        if rsi is None:
            return False
        return rsi < self.oversold

    def should_enter_short(self, data: pd.DataFrame, index: int) -> bool:
        rsi = self.calculate_rsi(data, index)
        if rsi is None:
            return False
        return rsi > self.overbought

    def should_exit(self, data: pd.DataFrame, index: int, entry_price: float, side: str) -> bool:
        current_price = data['close'].iloc[index]
        rsi = self.calculate_rsi(data, index)

        if side == 'long':
            pnl_pct = ((current_price - entry_price) / entry_price) * 100
            return pnl_pct <= -self.stop_loss_pct or (rsi is not None and rsi > self.overbought)
        else:  # short
            pnl_pct = ((entry_price - current_price) / entry_price) * 100
            return pnl_pct <= -self.stop_loss_pct or (rsi is not None and rsi < self.oversold)


class Backtester:
    """Main backtesting engine"""

    def __init__(
        self,
        data: pd.DataFrame,
        strategy: Strategy,
        initial_capital: float = 10000,
        position_size_pct: float = 100,
        fee_pct: float = 0.1,
        allow_shorts: bool = True
    ):
        self.data = data.copy()
        self.strategy = strategy
        self.initial_capital = initial_capital
        self.position_size_pct = position_size_pct
        self.fee_pct = fee_pct
        self.allow_shorts = allow_shorts

        self.trades: List[Trade] = []
        self.equity_curve: List[Dict] = []
        self.current_position:  Optional[Dict] = None
        self.capital = initial_capital

    def run(self) -> BacktestResult:
        """Execute backtest"""

        for i in range(len(self.data)):
            current_time = self.data.index[i]
            current_price = self.data['close'].iloc[i]

            # Check if we should exit current position
            if self.current_position:
                if self.strategy.should_exit(
                    self.data,
                    i,
                    self.current_position['entry_price'],
                    self.current_position['side']
                ):
                    self._close_position(i)

            # Check for new entry signals (only if no position)
            if not self.current_position:
                # Long signal
                if self.strategy.should_enter_long(self.data, i):
                    self._open_position(i, 'long')

                # Short signal
                elif self.allow_shorts and self.strategy.should_enter_short(self.data, i):
                    self._open_position(i, 'short')

            # Record equity
            unrealized_pnl = 0
            if self.current_position:
                if self.current_position['side'] == 'long':
                    unrealized_pnl = (current_price - self.current_position['entry_price']) * self.current_position['quantity']
                else:
                    unrealized_pnl = (self.current_position['entry_price'] - current_price) * self.current_position['quantity']

            self.equity_curve.append({
                'timestamp': current_time.isoformat(),
                'equity': self.capital + unrealized_pnl,
                'drawdown': 0  # Will calculate later
            })

        # Close any open position at the end
        if self.current_position:
            self._close_position(len(self.data) - 1)

        return self._calculate_metrics()

    def _open_position(self, index: int, side: str):
        """Open a new position"""
        entry_price = self.data['close'].iloc[index]
        entry_time = self.data.index[index]

        # ✅ FIXED: Position size sempre basato sul capitale INIZIALE
        # Non compounding - ogni trade rischia la stessa quantità fissa
        position_value = self.initial_capital * (self.position_size_pct / 100)

        # ✅ FIXED: Verifica capitale disponibile
        if position_value > self.capital * 0.95:
            # Non abbastanza capitale per aprire questa posizione
            return

        quantity = position_value / entry_price
        fees = position_value * (self.fee_pct / 100)

        if fees > self.capital:
            return

        self.capital -= fees

        self.current_position = {
            'entry_time': entry_time,
            'entry_price': entry_price,
            'quantity':  quantity,
            'side': side,
            'fees': fees,
            'position_value': position_value  # ✅ Salva per riferimento
        }

    def _close_position(self, index: int):
        """Close current position"""
        if not self.current_position:
            return

        exit_price = self.data['close'].iloc[index]
        exit_time = self.data.index[index]

        entry_price = self.current_position['entry_price']
        quantity = self.current_position['quantity']
        side = self.current_position['side']

        # ✅ FIXED: Calcola exit value
        exit_value = quantity * exit_price
        fees = exit_value * (self.fee_pct / 100)

        # ✅ FIXED: Calcola PnL corretto
        if side == 'long':
            # Long:  guadagni se prezzo sale
            pnl = (exit_price - entry_price) * quantity - fees - self.current_position['fees']
        else:  # short
            # Short: guadagni se prezzo scende
            pnl = (entry_price - exit_price) * quantity - fees - self.current_position['fees']

        pnl_percent = (pnl / self.current_position['position_value']) * 100

        # ✅ FIXED:  Aggiungi PnL al capitale (non exit_value completo)
        self.capital += pnl  # Solo il profitto/perdita, non tutto l'exit_value

        trade = Trade(
            entry_time=self.current_position['entry_time'],
            exit_time=exit_time,
            entry_price=entry_price,
            exit_price=exit_price,
            quantity=quantity,
            side=side,
            pnl=pnl,
            pnl_percent=pnl_percent,
            fees=self.current_position['fees'] + fees,
            result='win' if pnl > 0 else 'loss'
        )

        self.trades.append(trade)
        self.current_position = None

    def _calculate_metrics(self) -> BacktestResult:
        """Calculate performance metrics"""

        if len(self.trades) == 0:
            return BacktestResult(
                total_trades=0,
                winning_trades=0,
                losing_trades=0,
                win_rate=0,
                total_pnl=0,
                total_pnl_percent=0,
                avg_win=0,
                avg_loss=0,
                largest_win=0,
                largest_loss=0,
                profit_factor=0,
                sharpe_ratio=0,
                max_drawdown=0,
                max_drawdown_percent=0,
                total_fees=0,
                equity_curve=self.equity_curve,
                trades=[],
                strategy_name=self.strategy.name,
                symbol='UNKNOWN',
                timeframe='UNKNOWN',
                start_date=self.data.index[0].isoformat(),
                end_date=self.data.index[-1].isoformat(),
                initial_capital=self.initial_capital,
                final_capital=self.capital
            )

        # Basic stats
        total_trades = len(self.trades)
        winning_trades = sum(1 for t in self.trades if t.result == 'win')
        losing_trades = total_trades - winning_trades
        win_rate = (winning_trades / total_trades) * 100 if total_trades > 0 else 0

        # PnL stats
        total_pnl = sum(t.pnl for t in self.trades)
        total_pnl_percent = ((self.capital - self.initial_capital) / self.initial_capital) * 100

        wins = [t.pnl for t in self.trades if t.result == 'win']
        losses = [t.pnl for t in self.trades if t.result == 'loss']

        avg_win = np.mean(wins) if wins else 0
        avg_loss = np.mean(losses) if losses else 0
        largest_win = max(wins) if wins else 0
        largest_loss = min(losses) if losses else 0

        # Profit factor
        gross_profit = sum(wins) if wins else 0
        gross_loss = abs(sum(losses)) if losses else 0
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0

        # Sharpe ratio (simplified)
        returns = [t.pnl_percent for t in self.trades]
        sharpe_ratio = (np.mean(returns) / np.std(returns)) * np.sqrt(252) if len(returns) > 1 and np.std(returns) > 0 else 0

        # Max drawdown
        peak = self.initial_capital
        max_dd = 0
        max_dd_pct = 0

        for point in self.equity_curve:
            equity = point['equity']
            if equity > peak:
                peak = equity
            dd = peak - equity
            dd_pct = (dd / peak) * 100 if peak > 0 else 0

            if dd > max_dd:
                max_dd = dd
                max_dd_pct = dd_pct

            point['drawdown'] = dd_pct

        # Total fees
        total_fees = sum(t.fees for t in self.trades)

        # Convert trades to dict
        trades_dict = [
            {
                'entry_time': t.entry_time.isoformat(),
                'exit_time': t.exit_time.isoformat(),
                'entry_price': round(t.entry_price, 2),
                'exit_price':  round(t.exit_price, 2),
                'quantity':  round(t.quantity, 8),
                'side': t.side,
                'pnl': round(t.pnl, 2),
                'pnl_percent': round(t.pnl_percent, 2),
                'fees': round(t.fees, 2),
                'result': t.result
            }
            for t in self.trades
        ]

        return BacktestResult(
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=round(win_rate, 2),
            total_pnl=round(total_pnl, 2),
            total_pnl_percent=round(total_pnl_percent, 2),
            avg_win=round(avg_win, 2),
            avg_loss=round(avg_loss, 2),
            largest_win=round(largest_win, 2),
            largest_loss=round(largest_loss, 2),
            profit_factor=round(profit_factor, 2),
            sharpe_ratio=round(sharpe_ratio, 2),
            max_drawdown=round(max_dd, 2),
            max_drawdown_percent=round(max_dd_pct, 2),
            total_fees=round(total_fees, 2),
            equity_curve=self.equity_curve,
            trades=self.trades,
            strategy_name=self.strategy.name,
            symbol='BTCEUR',
            timeframe='1h',
            start_date=self.data.index[0].isoformat(),
            end_date=self.data.index[-1].isoformat(),
            initial_capital=self.initial_capital,
            final_capital=round(self.capital, 2)
        )
