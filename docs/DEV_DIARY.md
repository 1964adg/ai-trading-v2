# AI-Trading-v2 — Dev Diary / Handover Log

Questo file è un **diario tecnico incrementale** per mantenere continuità anche se la chat si interrompe.
Regola: aggiungere una nuova entry con data/ora e *non* riscrivere la storia (append-only).

## Indice rapido
- Repo: `1964adg/ai-trading-v2`
- Obiettivo: scalping 1m–30m + pattern scanner + overlay chart + logging (candles + book top20) + storico Binance per backtest/pattern.
- Setup attuale: backend+frontend in locale, DB PostgreSQL locale (no Docker per DB).

---

## Entry — 2026-01-07  (Europe/Rome)

### Contesto / Obiettivo della sessione
- Stabilizzare l’ambiente locale (senza Docker) e migrare lo storage su PostgreSQL locale.
- Preparare import storico candlestick Binance e poi passare API klines a **DB-first**.

### Stato iniziale
- Backend e frontend già avviabili localmente:
  - Backend: `cd backend && python main.py`
  - Frontend: `cd frontend && npm run dev`
- Problema: PostgreSQL su 5432 non partiva / servizio in timeout.
- Porta 5432 risultava occupata da:
  - `com.docker.backend.exe`
  - `wslrelay.exe`

### Decisioni tecniche importanti
1. **PostgreSQL locale su porta 5433** (evitare conflitti con Docker/WSL).
2. Usare **un solo database PostgreSQL** `ai_trading` per tutto:
   - Manteniamo le 3 URL logiche (`TRADING_DATABASE_URL`, `MARKET_DATABASE_URL`, `ANALYTICS_DATABASE_URL`)
   - ma puntano tutte allo *stesso DB* per compatibilità con la struttura multi-db esistente.
3. Non committare segreti: `backend/.env` in `.gitignore`, si committa solo `backend/.env.example`.

### Operazioni eseguite (DB)
- Postgres configurato su **5433** e verificato in ascolto.
- Password `postgres` ripristinata (login OK).
- Creati:
  - user: `trader`
  - db: `ai_trading`
- Backend collegato a Postgres:
  - `backend/config.py` legge ora `backend/.env` (`env_file=".env"`)
  - `backend/lib/database.py` reso compatibile con Postgres (SQLite pragmas solo se URL sqlite)

### Verifiche DB
- Tabelle create correttamente in `ai_trading` (Postgres):
  - `candlesticks`, `candlestick_metadata`
  - `orders`, `positions`, `portfolio_snapshots`
  - `pattern_cache`, `trade_execution_log`, `ml_model_results`, `analytics_metrics`

### Commit / Push rilevanti
- `85030f0` — Fix trailing stop: robust DataFrame empty check
- `490fe18` — Ignore local env files and generated artifacts
- `a50aa5c` — Support Postgres config and non-SQLite engines

### Stato API klines (prima del backfill)
- Endpoint: `GET /api/klines?symbol=BTCUSDT&timeframe=1m&limit=5`
- Risposta OK ma **sorgente: Binance** (DB vuoto inizialmente: `candlesticks=0`)
- Implementazione attuale:
  - `backend/api/market.py::_fetch_klines_data()` chiama sempre `binance_service.get_klines_data(...)`

### Importer storico (candlesticks)
Aggiunto script importer (in lavorazione nella sessione):

- Script: `backend/scripts/import_klines.py`
- Funzionalità:
  - scarica klines Binance in chunk (limit 1000)
  - inserisce in Postgres con `ON CONFLICT (symbol, interval, open_time) DO NOTHING`
  - aggiorna `candlestick_metadata`

Nota importante:
- Per eseguire come script, serve bootstrap `sys.path` per risolvere `from lib.database ...`
  - (in alternativa: usare `PYTHONPATH=.`)

#### Test eseguito
Import BTCUSDT 1m 2 giorni:
- Inserite ~2880 candele + 1 candela aggiuntiva al secondo run (range “now” diverso).
- Nessun duplicato grazie a unique index.

#### Import BTCUSDT 1m 90 giorni (success)
Verifiche:
- `COUNT(*)` su `candlesticks` per BTCUSDT 1m = **129600**
- `candlestick_metadata` aggiornata:
  - `earliest_timestamp`: 2025-10-09...
  - `latest_timestamp`: 2026-01-07...
  - `sync_status`: complete
- Tempo: ~3 minuti per BTCUSDT 90 giorni 1m.

#### Watchlist decisa (10 simboli)
`BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, ADAUSDT, DOGEUSDT, AVAXUSDT, LINKUSDT, POLUSDT`

Retention decisa:
- **1m: 90 giorni** (watchlist)
- (da decidere) 5m/15m/30m: 180–365 giorni

### Patch pianificata (post-import): /api/klines DB-first
Obiettivo:
- Se DB ha candles per `symbol+interval`, rispondere da DB (veloce).
- Se DB non ha dati, fallback Binance.

File target:
- `backend/api/market.py`
  - aggiungere query su tabella `candlesticks`
  - restituire payload invariato: `{"success": true, "data": [...]}`

### Warning/Issue aperte (non bloccanti)
1. Warning Pydantic:
   - `Field "model_type" has conflict with protected namespace "model_".`
   - Non dipende da `Settings`; probabilmente un modello Pydantic (es. TrainingRequest) va aggiornato con `model_config = ConfigDict(protected_namespaces=())` o rinomina campo.
2. Banner backend mostra CNN/LSTM “ENABLED” basandosi solo su `TORCH_AVAILABLE`,
   ma i modelli non sono presenti sul filesystem:
   - `pattern_cnn.pth` not found
   - `price_predictor` not found
   Serve rendere lo status ML veritiero (“torch ok” vs “model loaded”).

### Comandi utili (riavvio/controllo)
Backend:
- `cd backend && python main.py`

DB check:
- `psql -U trader -h localhost -p 5433 -d ai_trading -c "\dt"`
- `psql -U trader -h localhost -p 5433 -d ai_trading -c "SELECT COUNT(*) FROM candlesticks;"`

Import:
- `cd backend`
- `python scripts/import_klines.py --symbol BTCUSDT --interval 1m --days 2`
- `python scripts/import_klines.py --watchlist --intervals 1m --days 90`

### Next steps (ordine consigliato)
1. Finire import watchlist 90 giorni 1m.
2. Committare/pushare:
   - `backend/scripts/import_klines.py` (con fix sys.path)
   - `backend/.env.example` (senza segreti)
3. Patch `backend/api/market.py` per klines DB-first con fallback Binance.
4. Estendere import a 5m/15m/30m (decidere retention).
5. Logging order book top20:
   - solo quando “REC” o posizione aperta
   - campionamento (es. 250–500ms) e retention
6. Scanner “crypto interessanti” + overlay pattern su chart.
7. Sistemare warning Pydantic + banner ML status.

---
## Template per nuove entry

### Entry — YYYY-MM-DD HH:MM (Europe/Rome)
- **Obiettivo:**
- **Cosa è cambiato:**
- **Decisioni:**
- **Comandi:**
- **Problemi/soluzioni:**
- **Commit:**
- **Next:**

## Entry — 2026-01-07 19:00 (Europe/Rome) — Credenziali/porte + EUR vs USDT + import watchlist 90d

### Credenziali / Porte / Posizioni file (NO password)
- PostgreSQL:
  - Host: `localhost`
  - Porta: `5433`
  - Database: `ai_trading`
  - Utente: `trader`
- Backend:
  - URL: `http://localhost:8000`
  - `.env` letto da: `backend/.env` (NON versionato)
  - Esempio: `backend/.env.example` (da committare)
- Frontend:
  - URL: `http://localhost:3000`

### EUR vs USDT (Binance)
- In UI Binance, il filtro USDT mostrava “no data”, ma via API Binance risponde correttamente anche per USDT.
- Test eseguito via Python `requests` (PowerShell + `python -c`) con risultati `status=200` per:
  - `BTCEUR`, `ETHEUR`, `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `BNBUSDT`
- Decisione: **USDT-first** per storage/scalping/analisi (liquidità), EUR opzionale lato UI.

### Nota debug: curl su Windows
- `curl` fallisce verso Binance con errore schannel:
  - `CRYPT_E_NO_REVOCATION_CHECK`
- Workaround: usare Python `requests` per testare API; `curl -k` solo per debug.

### Import storico watchlist 90 giorni (1m)
- Import completato per la maggior parte dei simboli (es. BTCUSDT 1m: 129600 righe).
- Anomalia: `MATICUSDT` import 0 (DB count 0) ma metadata segnata `complete`.
  - Fix pianificato nello script importer:
    - se Binance ritorna `[]`, loggare “empty response”
    - `sync_status='error'` se `total_candles=0` (non `complete`)

#### Anomalia: MATICUSDT import 0
- Anomalia iniziale: `MATICUSDT` import 0 (DB count 0) ma metadata segnata `complete`.
- Risoluzione: sostituito in watchlist con `POLUSDT`.
  - Verifica: `POLUSDT` 1m 90 giorni = `129600` righe in `candlesticks`.
  - Metadata: `sync_status=complete`.

### Next steps
1. Committare/pushare:
   - `docs/DEV_DIARY.md` (questa entry)
   - `backend/scripts/import_klines.py` (fix empty response + metadata status + sys.path bootstrap)
   - `backend/.env.example`
2. Patch `backend/api/market.py`: klines **DB-first** con fallback Binance (payload invariato).

## 2026-01-07

- CI/CD: fix pipeline GitHub Actions (Backend Tests)
  - `/api/system/info`: normalizzato `database.type` per rispettare il contratto dei test (`PostgreSQL` / `In-Memory`).
  - Workflow: eseguita suite “safe” di test backend (invece del solo `test_api_system.py`) per raggiungere la soglia di coverage.
  - Coverage: **31.36%** (soglia richiesta: 30%).
  - Stato: **semaforo verde**.

## 2026-01-08 — Postgres in dev, SQLite forced in TESTING/CI; orderbook snapshots table

- Root cause: `orderbook_snapshots` was not visible in `backend/data/market_data.db` because the app was using Postgres via `MARKET_DATABASE_URL`, while the check was inspecting the SQLite file.
- Model registration: ensured `OrderbookSnapshot` is registered in `CandlestickBase.metadata`:
  - imported `OrderbookSnapshot` in `backend/models/__init__.py`
  - defensive import of `models.orderbook` in `backend/lib/database.py:create_tables()` before `CandlestickBase.metadata.create_all(...)`
- Config hardening: refactored `backend/config.py` to instantiate `Settings()` once and force SQLite DB URLs when `TESTING=true` or `CI=true`, preventing accidental Postgres usage in tests/scripts.
- Local env fix: removed a Windows Machine-level `MARKET_DATABASE_URL=sqlite:///./data/market_data.db` that was overriding `.env` and breaking “Postgres in dev”.
- Added `backend/check_db.py` diagnostic script to print active DB URLs and list market DB tables.

## 2026-01-08 — Standardized candlestick import metadata errors and importer robustness (Europe/Rome)

### Context
- **Project focus**: Binance Spot only (for now), manual-assisted trading (no auto-execution), paper trading R&D
- **Priority**: Data reliability and diagnosability for pattern/scanner/strategy development

### Retention Policy Decisions
Established retention policy for historical candlestick data:
- **1m interval**: 90 days (primary scalping timeframe)
- **5m/15m/30m intervals**: 180 days (medium-term pattern analysis)
- **1h/4h intervals**: On-demand import (longer-term trends)

### Standardized Error Reporting
Added comprehensive error tracking to `candlestick_metadata` model:
- New columns:
  - `error_code` (nullable String): Machine-readable error classification
  - `error_message` (nullable String): Human-readable error details
  - `last_attempt_at` (nullable DateTime TZ): Timestamp of last import attempt
  - `last_success_at` (nullable DateTime TZ): Timestamp of last successful import
- Error codes defined:
  - `EMPTY_RESPONSE`: Binance returned empty array (no data for timeframe)
  - `INVALID_SYMBOL`: Symbol not found on Binance
  - `INVALID_INTERVAL`: Invalid interval parameter
  - `RATE_LIMIT`: Hit Binance API rate limit
  - `NETWORK_ERROR`: Network/connection failure
  - `HTTP_ERROR`: HTTP error from Binance
  - `DB_ERROR`: Database operation failed
  - `UNKNOWN_ERROR`: Unexpected/unclassified error

### Importer Robustness Improvements
Enhanced `backend/scripts/import_klines.py` with:
1. **DB-truthful metadata**: Always compute `earliest_timestamp`, `latest_timestamp`, `total_candles` from actual DB state
2. **Correct status logic**:
   - `sync_status='complete'`: DB count > 0 and import succeeded
   - `sync_status='error'`: DB count == 0 or unrecoverable error
   - `sync_status='partial'`: Import failed mid-way but DB has some data
3. **Empty response handling**: If Binance returns `[]`, set `EMPTY_RESPONSE` error, do NOT mark complete
4. **Retry with backoff**: Exponential backoff for transient failures (rate limit, network), configurable max retries
5. **Continue-on-error mode**: Watchlist runs process all symbols/intervals, provide summary, exit code 1 if any failed
6. **Error field management**: Clear error fields on success, set on failure

### Migration
- Created `backend/scripts/migrate_add_metadata_errors.py` to add new columns
- Compatible with both PostgreSQL and SQLite
- Safe to run multiple times (checks if columns exist)

### Files Changed
- `backend/models/candlestick.py`: Added error reporting columns to `CandlestickMetadata`
- `backend/scripts/import_klines.py`: Complete refactor with error handling and retry logic
- `backend/scripts/migrate_add_metadata_errors.py`: New migration script
- `docs/DEV_DIARY.md`: This entry

### Next Steps
- Run migration script on existing database
- Test import scenarios (empty response, invalid symbol, rate limits)
- Verify metadata accuracy in all error conditions
