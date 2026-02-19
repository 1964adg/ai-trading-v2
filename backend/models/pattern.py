"""Pattern recognition and analytics models for analytics database."""

from sqlalchemy import Column, String, Float, DateTime, Integer, JSON, Index
from sqlalchemy.sql import func
from backend.lib.database import Base


class PatternCache(Base):
    """
    Cached pattern recognition results for fast lookups.
    Optimized for scalping with confidence scores.
    """

    __tablename__ = "pattern_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String, nullable=False, index=True)
    interval = Column(String, nullable=False, index=True)

    # Pattern identification
    pattern_type = Column(
        String, nullable=False, index=True
    )  # head_shoulders, double_top, etc.
    pattern_name = Column(String, nullable=False)

    # Pattern timing
    detected_at = Column(DateTime(timezone=True), nullable=False, index=True)
    pattern_start = Column(DateTime(timezone=True), nullable=False)
    pattern_end = Column(DateTime(timezone=True))

    # Pattern data
    confidence_score = Column(Float, nullable=False, index=True)  # 0.0 to 1.0
    entry_price = Column(Float)
    target_price = Column(Float)
    stop_loss = Column(Float)

    # Pattern details (JSON for flexibility)
    pattern_data = Column(JSON)  # Store pattern-specific data

    # Performance tracking
    status = Column(String, default="active")  # active, triggered, expired, failed
    actual_result = Column(String)  # success, failure, partial
    actual_pnl = Column(Float)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        # Fast pattern lookups
        Index("idx_symbol_pattern_time", "symbol", "pattern_type", "detected_at"),
        # Confidence filtering
        Index("idx_confidence", "confidence_score"),
        # Status queries
        Index("idx_status", "status"),
    )


class TradeExecutionLog(Base):
    """
    Detailed trade execution log with sub-millisecond latency tracking.
    Critical for scalping performance analysis.
    """

    __tablename__ = "trade_execution_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trade_id = Column(String, nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)

    # Execution details
    order_type = Column(String, nullable=False)  # market, limit, stop_loss, take_profit
    side = Column(String, nullable=False)  # buy, sell
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)

    # Timing (critical for scalping)
    signal_timestamp = Column(DateTime(timezone=True), nullable=False)
    order_sent_timestamp = Column(DateTime(timezone=True), nullable=False)
    order_filled_timestamp = Column(DateTime(timezone=True))

    # Latency metrics (in milliseconds)
    signal_to_order_latency_ms = Column(Float)  # Time from signal to order placement
    order_to_fill_latency_ms = Column(Float)  # Time from order to fill
    total_latency_ms = Column(Float)  # Total latency

    # Pattern trigger (if applicable)
    pattern_id = Column(Integer, index=True)
    pattern_type = Column(String)
    pattern_confidence = Column(Float)

    # Execution result
    status = Column(
        String, nullable=False
    )  # pending, filled, partial, cancelled, failed
    filled_quantity = Column(Float)
    average_fill_price = Column(Float)

    # Slippage analysis
    expected_price = Column(Float)
    slippage = Column(Float)  # Difference between expected and actual
    slippage_pct = Column(Float)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    notes = Column(String)

    __table_args__ = (
        # Time-series queries
        Index("idx_created_at", "created_at"),
        # Trade analysis
        Index("idx_symbol_time", "symbol", "created_at"),
        # Pattern correlation
        Index("idx_pattern_trades", "pattern_id", "status"),
    )


class MLModelResult(Base):
    """
    Machine learning model predictions and results.
    Tracks ML model performance for continuous improvement.
    """

    __tablename__ = "ml_model_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String, nullable=False, index=True)
    model_version = Column(String, nullable=False)

    # Prediction details
    symbol = Column(String, nullable=False, index=True)
    interval = Column(String, nullable=False)
    prediction_timestamp = Column(DateTime(timezone=True), nullable=False, index=True)

    # Prediction
    prediction_type = Column(String, nullable=False)  # price, direction, pattern, etc.
    predicted_value = Column(Float)
    confidence = Column(Float)
    prediction_data = Column(JSON)  # Store additional prediction details

    # Validation
    actual_value = Column(Float)
    prediction_error = Column(Float)
    is_correct = Column(
        Integer
    )  # 1 for correct, 0 for incorrect, NULL for not yet validated

    # Performance tracking
    validation_timestamp = Column(DateTime(timezone=True))
    time_to_validation_hours = Column(Float)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        # Model performance analysis
        Index(
            "idx_model_performance", "model_name", "is_correct", "prediction_timestamp"
        ),
        # Symbol predictions
        Index("idx_symbol_predictions", "symbol", "prediction_timestamp"),
    )


class AnalyticsMetrics(Base):
    """
    Aggregated analytics metrics for dashboard display.
    Pre-computed metrics to reduce real-time calculation overhead.
    """

    __tablename__ = "analytics_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    metric_type = Column(
        String, nullable=False, index=True
    )  # daily_pnl, pattern_success_rate, etc.
    metric_name = Column(String, nullable=False)

    # Scope
    symbol = Column(String, index=True)  # NULL for global metrics
    timeframe = Column(String)
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)

    # Metric value
    value = Column(Float, nullable=False)
    secondary_value = Column(Float)  # For metrics with multiple values

    # Details
    details = Column(JSON)  # Store breakdown or additional context

    # Metadata
    calculated_at = Column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    __table_args__ = (
        # Metric lookups
        Index("idx_metric_lookup", "metric_type", "symbol", "period_start"),
        # Time-series metrics
        Index("idx_metric_timeseries", "metric_type", "calculated_at"),
    )
