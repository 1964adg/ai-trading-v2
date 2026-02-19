# SQLite Multi-Database Architecture

## Overview

The AI Trading system now uses a **3-database SQLite architecture** optimized for scalping and pattern analysis, replacing the previous PostgreSQL setup.

## Database Structure

### 1. Trading Database (`trading.db`)
**Purpose**: Active trading operations
- **Tables**:
  - `positions` - Open and closed trading positions
  - `orders` - Order history and execution details
  - `portfolio_snapshots` - Portfolio state snapshots

**Optimized for**: Fast read/write operations, real-time position tracking

### 2. Market Data Database (`market_data.db`)
**Purpose**: Historical market data storage
- **Tables**:
  - `candlesticks` - OHLCV data across multiple timeframes (1m, 5m, 15m, 1h, 4h, 1d)
  - `candlestick_metadata` - Data availability tracking and sync status

**Optimized for**: Time-series queries, multi-timeframe analysis, bulk imports

### 3. Analytics Database (`analytics.db`)
**Purpose**: Pattern recognition and ML results
- **Tables**:
  - `pattern_cache` - Cached pattern recognition results with confidence scores
  - `trade_execution_log` - Detailed execution tracking with sub-millisecond latency metrics
  - `ml_model_results` - ML model predictions and validation results
  - `analytics_metrics` - Pre-computed analytics for dashboard display

**Optimized for**: Pattern lookups, ML model tracking, performance analysis

## Configuration

### Environment Variables

```env
# Trading Database - Active trades, positions, orders
TRADING_DATABASE_URL=sqlite:///./data/trading.db

# Market Data Database - Historical candlestick data
MARKET_DATABASE_URL=sqlite:///./data/market_data.db

# Analytics Database - Pattern detection, ML results
ANALYTICS_DATABASE_URL=sqlite:///./data/analytics.db
```

### SQLite Optimizations Applied

All databases are configured with:
- **WAL Mode**: Write-Ahead Logging for better concurrency
- **Synchronous NORMAL**: Balanced performance and safety
- **Foreign Keys**: Enabled for referential integrity
- **Cache Size**: 2MB per database for faster queries
- **Indexes**: Optimized for time-series and symbol lookups

## Usage

### Database Initialization

Databases are automatically initialized on backend startup:

```python
from backend.lib.database import init_database, create_tables

# Initialize all three databases
if init_database():
    create_tables()
    print("All databases ready!")
```

### Accessing Databases

```python
from backend.lib.database import get_db

# Trading database (default)
with get_db('trading') as db:
    positions = db.query(Position).all()

# Market database
with get_db('market') as db:
    candles = db.query(Candlestick).filter(
        Candlestick.symbol == 'BTCUSDT',
        Candlestick.interval == '1h'
    ).all()

# Analytics database
with get_db('analytics') as db:
    patterns = db.query(PatternCache).filter(
        PatternCache.confidence_score > 0.8
    ).all()
```

### Database Health Check

```python
from backend.lib.database import check_database_health

health = check_database_health()
# Returns: {'trading': 'connected', 'market': 'connected', 'analytics': 'connected'}
```

## Management Tools

### Database Utility Script

The `lib/db_utils.py` script provides management functions:

```bash
cd backend
PYTHONPATH=. python lib/db_utils.py
```

**Features**:
- Database initialization and verification
- Integrity checks
- Statistics (size, fragmentation)
- Export/import capabilities
- Optimization (VACUUM, ANALYZE)

### Available Functions

```python
from backend.lib.db_utils import (
    initialize_databases,      # Create all tables
    verify_database_integrity, # Check table counts
    export_database,          # Export to SQL dump
    import_database,          # Import from SQL dump
    optimize_databases,       # Run VACUUM and ANALYZE
    get_database_stats        # Get size and fragmentation stats
)
```

## Benefits Over PostgreSQL

1. **Zero Configuration**: No external database server required
2. **Portability**: Database files can be easily copied/backed up
3. **Performance**: Faster for read-heavy workloads typical in trading
4. **Scalability**: Separate databases allow independent scaling
5. **Development**: Simplified local development and testing
6. **Data Isolation**: Clear separation between trading, market data, and analytics

## Performance Characteristics

### Expected Query Performance

- **Position Lookups**: <1ms (indexed by symbol)
- **Candlestick Queries**: <10ms for 1000 candles (multi-timeframe indexes)
- **Pattern Cache Hits**: <5ms (indexed by symbol, type, confidence)
- **Trade Log Queries**: <20ms for complex latency analysis

### Scalability Limits

- **Trading DB**: ~10,000 active positions, unlimited history
- **Market DB**: ~100M candlesticks (multiple symbols, timeframes)
- **Analytics DB**: ~1M patterns, unlimited execution logs

## Backup and Recovery

### Manual Backup

```bash
# Copy database files
cp data/trading.db data/backup/trading_$(date +%Y%m%d).db
cp data/market_data.db data/backup/market_$(date +%Y%m%d).db
cp data/analytics.db data/backup/analytics_$(date +%Y%m%d).db
```

### Export to SQL

```python
from backend.lib.db_utils import export_database

# Export to SQL dump
export_database('trading', './backups/trading_export.sql')
```

### Recovery

```python
from backend.lib.db_utils import import_database

# Import from SQL dump
import_database('trading', './backups/trading_export.sql')
```

## Migration from PostgreSQL

If migrating from PostgreSQL, the system maintains backward compatibility:

1. The `DATABASE_URL` environment variable is still supported
2. Legacy code using `engine` and `SessionLocal` continues to work
3. They now map to the trading database by default

## Testing

Comprehensive tests are available in `tests/test_multi_database.py`:

```bash
cd backend
pytest tests/test_multi_database.py -v
```

**Test Coverage**:
- Configuration validation
- Multi-database initialization
- Health checks
- CRUD operations on all databases
- Paper trading integration
- SQLite optimizations

## Monitoring

Check database status via API:

```bash
curl http://localhost:8000/api/system/info
```

Response includes:
```json
{
  "database": {
    "status": "connected",
    "type": "SQLite Multi-Database",
    "databases": {
      "trading": "connected",
      "market": "connected",
      "analytics": "connected"
    },
    "urls": {
      "trading": "./data/trading.db",
      "market": "./data/market_data.db",
      "analytics": "./data/analytics.db"
    }
  }
}
```

## Future Enhancements

Planned improvements:
- Automatic backup scheduling
- Read replicas for analytics queries
- Compression for historical data
- Time-series partitioning for market data
- Real-time replication to cloud storage
