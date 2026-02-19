# ai-trading-v2 – Project Structure

## Directory Map

```
backend/
    models/
        base.py
        position.py
        order.py
        portfolio_snapshot.py
        orderbook.py
        custom_symbols.py
        candlestick.py
        pattern.py
        __init__.py
    api/
    lib/
    services/
    app/
    migrations/
    utils/
    main.py
    config.py
    check_db.py
frontend/
docs/
data/
infrastructure/
scripts/
```

## Database (PostgreSQL)

| Model                | Table                    | Description                                       |
|----------------------|--------------------------|---------------------------------------------------|
| Position             | positions                | Trading positions, lifecycle tracking             |
| Order                | orders                   | Orders linked to positions                        |
| PortfolioSnapshot    | portfolio_snapshots      | Account snapshot, PNL tracking                    |
| OrderbookSnapshot    | orderbook_snapshots      | Book snapshot (deep levels)                       |
| CustomSymbol         | custom_symbols           | User custom symbols                               |
| Candlestick          | candlesticks             | OHLCV historic data                               |
| CandlestickMetadata  | candlestick_metadata     | Data availability, sync                           |
| PatternCache         | pattern_cache            | Pattern/caching/metrics                           |
| TradeExecutionLog    | trade_execution_log      | Trade log with latency, slippage                  |
| MLModelResult        | ml_model_results         | ML predictions/results                            |
| AnalyticsMetrics     | analytics_metrics        | Aggregated dashboard metrics                      |

---

## Quick Start

- Segui README.md per installazione, configurazione ed esecuzione.
- Elimina qualunque file `.db` legacy non più necessario.
- Tutto il backend ora usa solo la variabile `DATABASE_URL` (PostgreSQL).