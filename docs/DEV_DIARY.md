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
`BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, ADAUSDT, DOGEUSDT, AVAXUSDT, LINKUSDT, MATICUSDT`

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