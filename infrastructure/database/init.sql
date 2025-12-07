-- AI Trading V2 Database Schema
-- TimescaleDB Extensions and Trading Data Tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CORE TRADING TABLES
-- ============================================================

-- Market data with OHLCV and indicators
CREATE TABLE IF NOT EXISTS market_data (
    timestamp TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    open DECIMAL(18,8) NOT NULL,
    high DECIMAL(18,8) NOT NULL,
    low DECIMAL(18,8) NOT NULL,
    close DECIMAL(18,8) NOT NULL,
    volume DECIMAL(18,8) NOT NULL,
    indicators JSONB,
    PRIMARY KEY (timestamp, symbol, timeframe)
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('market_data', 'timestamp', if_not_exists => TRUE);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timeframe 
    ON market_data (symbol, timeframe, timestamp DESC);

-- ============================================================
-- PATTERN RECOGNITION TABLES
-- ============================================================

-- Pattern detection results
CREATE TABLE IF NOT EXISTS pattern_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    signal VARCHAR(10),
    outcome BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pattern_detections_timestamp 
    ON pattern_detections (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_detections_symbol 
    ON pattern_detections (symbol, timestamp DESC);

-- ============================================================
-- AI PREDICTIONS AND LEARNING
-- ============================================================

-- AI model predictions and accuracy tracking
CREATE TABLE IF NOT EXISTS ai_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    prediction_type VARCHAR(50) NOT NULL,
    predicted_value DECIMAL(18,8),
    confidence DECIMAL(5,2),
    actual_value DECIMAL(18,8),
    accuracy_score DECIMAL(5,2),
    features JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_predictions_timestamp 
    ON ai_predictions (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_model 
    ON ai_predictions (model_name, timestamp DESC);

-- ============================================================
-- USER MANAGEMENT (FUTURE)
-- ============================================================

-- User sessions and authentication
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token 
    ON user_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user 
    ON user_sessions (user_id, created_at DESC);

-- ============================================================
-- AUDIT AND LOGGING
-- ============================================================

-- Trading activity audit log
CREATE TABLE IF NOT EXISTS trading_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    action VARCHAR(50) NOT NULL,
    symbol VARCHAR(20),
    quantity DECIMAL(18,8),
    price DECIMAL(18,8),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    execution_time_ms INTEGER,
    user_context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('trading_audit', 'timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_trading_audit_action 
    ON trading_audit (action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trading_audit_symbol 
    ON trading_audit (symbol, timestamp DESC);

-- ============================================================
-- DATA RETENTION POLICIES
-- ============================================================

-- Keep market data for 2 years
SELECT add_retention_policy('market_data', INTERVAL '2 years', if_not_exists => TRUE);

-- Keep audit logs for 1 year
SELECT add_retention_policy('trading_audit', INTERVAL '1 year', if_not_exists => TRUE);

-- ============================================================
-- COMPRESSION POLICIES
-- ============================================================

-- Compress market data older than 7 days
SELECT add_compression_policy('market_data', INTERVAL '7 days', if_not_exists => TRUE);

-- Compress audit logs older than 30 days
SELECT add_compression_policy('trading_audit', INTERVAL '30 days', if_not_exists => TRUE);

-- ============================================================
-- INITIALIZATION COMPLETE
-- ============================================================

-- Grant permissions to trading user (least privilege)
GRANT CONNECT ON DATABASE trading_ai TO trader;
GRANT USAGE ON SCHEMA public TO trader;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO trader;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO trader;

-- Grant permissions on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO trader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO trader;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'AI Trading V2 Database Initialized Successfully';
    RAISE NOTICE 'Tables: market_data, pattern_detections, ai_predictions, user_sessions, trading_audit';
    RAISE NOTICE 'TimescaleDB: Enabled with hypertables for time-series data';
    RAISE NOTICE 'Retention: market_data (2 years), trading_audit (1 year)';
    RAISE NOTICE 'Compression: Enabled for data older than 7/30 days';
END $$;
