# Struttura del progetto (aggiornata al 2026-02-13)

## ROOT
- .editorconfig
- .env / .env.example
- .gitattributes / .gitignore
- docker-compose.*.yml / Dockerfile / Dockerfile.prod
- README.md / IMPLEMENTATION_COMPLETE.md / MIGRATION_SUMMARY.md / PATTERN_STORE_ARCHITECTURE.md / PATTERN_STORE_IMPLEMENTATION.md
- package-lock.json / package.json
- project_structure.txt
- test_backend.ps1 / validate.ps1 / validate_ml.sh

## .github/
- workflows/
    - ci.yml

---

## backend/
- .coverage / .dockerignore / .env / .env.example / .gitignore
- check_db.py / config.py / main.py / pippo.py / pytest.ini / test_pytorch_optional.py / __init__.py
- DATABASE.md / README.md / requirements-dev.txt / requirements.txt

- api/
    - advanced_orders.py / market.py / ml.py / paper_trading.py / system.py / __init__.py
- app/
    - __init__.py
- data/
    - analytics.db / market_data.db / trading.db
- htmlcov/
    - *.html / *.js / *.css / *.json
- infrastructure/
- lib/
    - alert_engine.py / backtester.py / database.py / db_utils.py / indicators.py / risk_calculator.py
- models/
    - base.py / candlestick.py / order.py / orderbook.py / pattern.py / portfolio_snapshot.py / position.py / __init__.py
- scripts/
    - import_klines.py / migrate_add_metadata_errors.py / validate_metadata_errors.py
- services/
    - advanced_orders_service.py / binance_service.py / candlestick_service.py / ml_service.py / orderbook_recorder.py / order_monitoring_service.py / paper_trading_service.py / realtime_service.py / trailing_stop_service.py / websocket_manager.py / __init__.py
- tests/
    - conftest.py / test_advanced_orders.py / test_api_backtest.py / ... / __init__.py
- .pytest_cache/   # (contenuto omesso)

---

## data/
- README.md

## docs/
- DEV_DIARY.md / README.md
- api/
    - advanced-orders.md / paper-trading-backend.md
- architecture/
    - implementation-summary.md / ml-infrastructure.md
- archive/
    - ADVANCED_ORDERS_FORMS_GUIDE.md / ... / FINAL_SUMMARY.md / ... / WEBSOCKET_IMPLEMENTATION_SUMMARY.md
- guides/
    - backtesting.md / docker-quick-ref.md / docker.md / indicators.md / shortcuts.md / testing.md

---

## frontend/
- .dockerignore / .eslintrc.json / .gitignore / package.json / README.md / Dockerfile / Dockerfile.prod
- ARCHITECTURE_QUICK_REFERENCE.md / ENHANCED_ORDERS_GUIDE.md / IMPLEMENTATION_SUMMARY.md / INTEGRATION_TESTING.md / MULTI_PAGE_ARCHITECTURE.md / ORDER_FLOW_GUIDE.md / PATTERN_RECOGNITION.md / REAL_TRADING_DOCS.md / SECURITY_GUIDE.md / USAGE_EXAMPLE.tsx

- app/
    - favicon.ico / globals.css / layout.tsx / page.tsx
    - analysis/
        - page.tsx    # senza sezione candele/importazione (rimossa)
    - backtest/
        - page.tsx    # con nuova sezione candele/import (aggiunta)
- components/
    - CandleTableSection.tsx    # nuovo componente modulare tabulato candele
    - LiveIndicator.tsx / Navigation.tsx / PatternDashboard.tsx / ... / TradingChartBackup.tsx
- hooks/
    - useBacktest.ts / useChartManager.ts / ... / useWebSocket.ts
- lib/
    - advanced-orders-api.ts / api.ts / ... / trading-calculations.ts / types.ts / websocket-client.ts
- src/
    - setupTests.ts
- stores/
    - backtestStore.ts / marketStore.ts / ... / tradingStore.ts / watchListStore.ts
- tests/
    - analysis-fallback.test.ts / binance-api.test.ts / ... / useDebouncedValue.test.ts
- types/
    - backtesting.ts / binance.ts / ... / trading.ts
- __tests__/           # (contenuto omesso)
- .next/               # (contenuto omesso)

---

## infrastructure/
- database/
    - init.sql
- kubernetes/
    - backend-deployment.yml / frontend-deployment.yml / ingress.yml / namespace.yml / README.md
- ml/
- monitoring/
    - prometheus.yml
- nginx/
    - nginx.conf

---

## scripts/
- dev-setup.sh / prod-deploy.sh / test_ml_api.sh / validate-docker.sh / validate_ml_infrastructure.py

---

### **Note recenti**
- [2026-02-13]: Modularizzata tabella candele (`CandleTableSection.tsx`) e integrata in `/backtest`.
- [2026-02-13]: Rimossa sezione candele/importazione da `/analysis`.
- [2026-02-13]: Aggiornata la navigazione e routing secondo nuova struttura.
