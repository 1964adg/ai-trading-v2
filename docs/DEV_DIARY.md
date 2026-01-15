# AI-Trading-v2 — Dev Diary / Handover Log

Questo file è un **diario tecnico incrementale** per mantenere continuità anche se la chat si interrompe.
Regola: aggiungere una nuova entry con data/ora e *non* riscrivere la storia (append-only).

### Runbook — Avvio server (dev locale)

- **Comando canonico (consigliato) — Frontend (workspace, da root repo)**
  Da `C:\ai-trading-v2`:
  ```bash
  npm -w frontend run dev
  ```
  Motivazione: il repo usa **npm workspaces**; l’avvio da root assicura risoluzione dipendenze e script coerenti col workspace (evita mismatch rispetto a lanciare `npm run dev` dentro `frontend/`).

- **Backend (da cartella backend)**
  Da `C:\ai-trading-v2\backend`:
  ```bash
  python main.py
  ```
  Atteso: API su `http://localhost:8000`

- **URL attesi**
  - Frontend: `http://localhost:3000`
  - Backend: `http://localhost:8000`

- **Build check (opzionale)**
  Da root:
  ```bash
  npm -w frontend run build
  ```


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

### Entry — 2026-01-08 (Europe/Rome) — UI SymbolSearchModal (Binance live) + Quote toggle EUR/USDC + Data import/coverage in Analysis

- **Obiettivo:**
  - Rendere la selezione simboli in UI coerente con Binance (UE) e con l’operatività reale: coppie **EUR/USDC** (no USDT default).
  - Introdurre una gestione “data-driven” dello storico: vedere copertura dati e lanciare import da UI.

- **Stato attuale (prima delle modifiche):**
  - La modal `frontend/components/modals/SymbolSearchModal.tsx` gestisce già:
    - preset “Quick Access” (max 10),
    - ⭐ preferiti (unlimited),
    - ordinamenti (name/price/change/volume/favorites/presets),
    - search.
  - Però la lista simboli è **hardcoded** (`BINANCE_SYMBOLS`) e contiene anche coppie USDT, quindi non è una fonte affidabile rispetto a Binance reale.
  - Lato UI Trading: simbolo default `BTCEUR` (ok UE), watchlist default EUR, ma manca un selettore esplicito **EUR/USDC**.
  - Lato storico: esiste importer `backend/scripts/import_klines.py` + tabella `candlestick_metadata` con error tracking (error_code/error_message/last_attempt_at/last_success_at).

- **Decisioni:**
  1. **Modal principale = SymbolSearchModal** (quella attivata dal click sul simbolo in alto a sinistra). È la “fonte verità” per:
     - selezione simbolo,
     - preset (max 10),
     - preferiti.
  2. Aggiungere filtro **Quote** in modal: `ALL | EUR | USDC` (default: ALL o persistito).
  3. Sostituire `BINANCE_SYMBOLS` hardcoded con dati reali da Binance (via client già presente in `frontend/lib/binance-api.ts`):
     - caricare `exchangeInfo + ticker 24h`,
     - filtrare a runtime su quoteAsset (EUR/USDC) e status TRADING.
  4. In `/analysis`: aggiungere pannello “Market Data Coverage + Import”:
     - scegliere simbolo (riuso SymbolSearchModal),
     - scegliere timeframe (1m/5m/15m/30m/1h/4h),
     - scegliere periodo (days oppure range),
     - bottone **Import**,
     - tabella “coverage” da `candlestick_metadata` (total/earliest/latest/sync_status/error_code).

- **Backend richiesto (per abilitare Import da UI):**
  - Aggiungere endpoint:
    - `GET  /api/market/metadata` → legge `candlestick_metadata` (filtri symbol/interval opzionali).
    - `POST /api/market/import` → trigger import klines (symbol, intervals, days) in background e ritorna subito “accepted”.
  - Nota: l’import deve essere non-bloccante (background task) e aggiornare `candlestick_metadata` durante/alla fine.

- **Note operative:**
  - Durante import massivi, per evitare “rumore” in locale:
    - ridurre/pausare refresh UI (watchlist polling + SWR refresh) oppure chiudere la tab Trading.
  - Errori `EMPTY_RESPONSE` vicino al “now” sono normali: in DB restano come `sync_status=partial` se `total_candles>0`.

- **File principali coinvolti:**
  - Frontend:
    - `frontend/components/modals/SymbolSearchModal.tsx`
    - `frontend/lib/binance-api.ts`
    - `frontend/app/analysis/page.tsx` (pannello coverage + import)
  - Backend:
    - `backend/api/market.py` (o router dedicato) per metadata/import endpoint
    - `backend/scripts/import_klines.py` (riuso logica importer)

- **Next:**
  1. Implementare fetch Binance live in SymbolSearchModal + filtro Quote EUR/USDC.
  2. Implementare endpoint metadata/import.
  3. Implementare pannello Analysis: coverage + import + feedback stato.
## 2026-01-09 — Canonical Summary / TL;DR

### Primary Achievement: Next.js 14.2.35 Security Bump + Build Stabilization
**Main PR:** [#84 - chore(frontend): bump next to 14.2.35 + fix PatternSelector build](https://github.com/1964adg/ai-trading-v2/pull/84)
**Merge commit (squash):** [cb66261](https://github.com/1964adg/ai-trading-v2/commit/cb66261)
**Diary follow-up commit:** [9b49878](https://github.com/1964adg/ai-trading-v2/commit/9b49878)

**Key changes merged to main:**
- Upgraded Next.js to **14.2.35** (security patch)
- Fixed TypeScript build error in `frontend/components/trading/PatternSelector.tsx`:
  - Removed `<style jsx>` (unsupported `jsx` prop in TS)
  - Aligned slider class/CSS selectors (`pattern-selector-slider`)
- Fixed ESLint warning in `frontend/app/analysis/page.tsx` (exhaustive-deps)
- Verified: `npm run build` ✅ green

**Related work completed (same session):**
- Klines DB-first implementation with `source` field ("db" | "binance") in API responses
- Pattern marker visualization (BUY/SELL/W instead of pattern names)
- ESLint workspace stabilization (pinned to 8.57.1 for monorepo compatibility)

**Outstanding items:**
- `npm audit` reports 3 high severity vulnerabilities (follow-up required, avoid force-fix without review)
- Analysis page "/analysis" shows "No patterns detected yet" (pattern engine data flow TBD)

---

### Appendix: Session Notes (Duplicate Details)

Below are the raw session notes from 2026-01-09. These contain overlapping information and are preserved here for historical completeness per the append-only rule.

#### Session Note A: Brief klines DB-first entry
Data: 2026-01-09
Attività svolte:

Backend: endpoint GET /api/klines e GET /api/klines/range ora espongono source: "db" | "binance" per verificare in modo definitivo se i dati arrivano dal DB o da Binance.
Importer: gestione EMPTY_RESPONSE resa non-fatal quando esistono già candele nel DB (stato “partial”, script esce success).
Frontend: aggiunto selettore “periodo” sul dashboard e supporto al caricamento storico via /api/klines/range (range/preset). (Da rifinire: limitare periodo max a 1D se desiderato.)
Debug: chiarito che il frontend usa /api/klines?symbol=...&timeframe=... e introdotta normalizzazione per evitare mismatch su timeframe/symbol.
Risultato: DB-first verificato in modo oggettivo (BTCUSDT→db, BTCEUR→binance) e range endpoint pronto per storico.

#### Session Note B: Klines DB-first + debug source + chart range + coverage
## 2026-01-09
### Klines DB-first + debug source + chart range + coverage
- Backend: aggiunto campo `source: "db" | "binance"` nella response di:
  - `GET /api/klines`
  - `GET /api/klines/range`
  per verificare in modo oggettivo se i dati arrivano dal DB o da Binance.
- Importer: `EMPTY_RESPONSE` non è più fatal se nel DB esistono già candele (`partial` invece di `failed`).
- Frontend: aggiunto dropdown periodo (preset) accanto al pattern threshold e supporto fetch via `/api/klines/range` (range/preset).
- Note: verificato che `BTCUSDT` risponde con `source=db` e `BTCEUR` con `source=binance`.

#### Session Note C: Pattern markers BUY/SELL/W + fix ESLint in monorepo workspaces

### Entry — 2026-01-09 (Europe/Rome) — Pattern markers BUY/SELL/W + fix ESLint in monorepo workspaces

- **Obiettivo:**
  - Rendere i marker pattern sul chart operativi (BUY/SELL/W) invece del nome pattern.
  - Stabilizzare toolchain ESLint/TypeScript in monorepo npm workspaces (Next.js 14).

- **Cosa è cambiato (Frontend UI):**
  - `frontend/components/charts/PatternOverlay.tsx` e `frontend/components/TradingChart.tsx` aggiornati per usare una logica marker "operativa":
    - BULLISH → `BUY` (shape arrowUp, green)
    - BEARISH → `SELL` (shape arrowDown, red)
    - NEUTRAL → `W` (shape circle, amber)
  - `TradingChart.tsx` ora usa helper `convertPatternsToOverlays()` + `createChartMarkers()` per generare markers.

- **Build/Lint (Root cause e fix):**
  - Root cause: mix di ESLint 8 e 9 nello stesso albero (workspace), con crash su regole `@typescript-eslint/*`.
  - Fix applicato: uniformato tutto il monorepo su ESLint 8.57.1 (compatibile con Next 14.2.33).
  - Nota operativa importante: in workspaces usare comandi dal root:
    - Build frontend: `npm -w frontend run build`

- **Decisioni:**
  - ESLint 8.57.1 pinned a livello root workspace per evitare conflitti tra Next.js e plugin typescript-eslint.
  - I comandi workspace (`npm -w ...`) diventano la modalità standard per build/lint.

- **Comandi utili:**
  - `cd C:\ai-trading-v2`
  - `npm install`
  - `npm -w frontend run build`
  - `npm ls eslint`

- **Issue aperte / Next:**
  - La pagina `/analysis` mostra “No patterns detected yet” perché non riceve/calcora candles per il pattern engine: decidere architettura “pattern centralizzati” vs “ricalcolo per pagina”.
  - Proporre una “centrale” unica per patterns+alerts, con UI main page ricca ma configurazione avanzata solo in analysis.
#### Session Note D: Next 14.2.35 bump + build fix PatternSelector + stato dashboard

## 2026-01-09 — Next 14.2.35 bump + build fix PatternSelector + stato dashboard

### Obiettivo
- Aggiornare Next.js per security patch e ripristinare build green.
- Riprendere controllo dello stato dopo cherry-pick conflittuali.

### Stato branch / PR
- Branch: `chore/bump-next-14.2.35`
- Commit:
  - `chore(frontend): bump next to 14.2.35 (security)`
  - `fix(frontend): fix PatternSelector slider styles for Next 14 build` (rimosso `style jsx`, allineati selettori slider)

### Risultati
- `cd frontend && npm install`: OK (ma `npm audit` segnala 3 high severity – da valutare in follow-up)
- `cd frontend && npm run build`: OK (build green)
- Warning rimasto:
  - `app/analysis/page.tsx` useEffect exhaustive-deps (`isFallbackLoading`)

### Note operative
- Durante il cherry-pick del commit di fix build si è generato conflitto su `PatternSelector.tsx`.
- Risoluzione corretta: classe `pattern-selector-slider` sull’input range + CSS matching; rimozione `jsx` da `<style>` per compatibilità TS/Next build.

### Problema aperto (funzionale)
- “Dashboard non mostra nulla”: da investigare separatamente (probabile flusso dati/candles/store o fetch).
- Prossimi step: verificare API backend, store `useMarketStore/usePatternStore`, e che il frontend stia ricevendo klines (network tab + log store).


#### Session Note E: Next 14.2.35 bump + build fix PatternSelector + analysis deps

### Entry — 2026-01-09 (Europe/Rome) — Next 14.2.35 bump + build fix PatternSelector + analysis deps

- **Obiettivo:**
  - Fare security bump Next e ripristinare build green (Next build/TS).
  - Chiudere i conflitti su `PatternSelector` e lasciare stato tracciato.

- **Cosa è cambiato:**
  - Frontend: bump `next` a **14.2.35** (security).
  - Fix build: `frontend/components/trading/PatternSelector.tsx`
    - rimosso `jsx` da `<style>` (errore TS: prop `jsx` non tipizzato)
    - riallineata classe slider: `pattern-selector-slider` (input) + selettori CSS corrispondenti
  - Fix lint warning: `frontend/app/analysis/page.tsx`
    - aggiunta dipendenza `isFallbackLoading` nel `useEffect` fallback fetch (react-hooks/exhaustive-deps)

- **Verifiche:**
  - `cd frontend && npm install` OK
  - `cd frontend && npm run lint` OK
  - `cd frontend && npm run build` OK

- **Note:**
  - `npm audit` segnala vulnerabilità high: da valutare in follow-up separato (evitare `npm audit fix --force` senza review).


#### Session Note F: Brief PR #84 reference

PR #84, bump Next 14.2.35, fix PatternSelector build (rimozione <style jsx>), test npm run build ok, note npm audit.


#### Session Note G: PR #84 (Next 14.2.35 security bump + build fix)

### Entry — 2026-01-09 (Europe/Rome) — PR #84 (Next 14.2.35 security bump + build fix)

- **PR:** #84 — https://github.com/1964adg/ai-trading-v2/pull/84
- **Merge:** Squash & merge su `main`

- **Obiettivo:**
  - Security bump di Next.js e ripristino build green.

- **Cosa è cambiato (squash):**
  - Bump `next` a **14.2.35**.
  - Fix build TypeScript in `frontend/components/trading/PatternSelector.tsx`:
    - rimosso `<style jsx>` (prop `jsx` non tipizzato → errore in build)
    - allineata classe/selector slider (`pattern-selector-slider`).

- **Verifiche locali:**
  - `cd frontend && npm install`
  - `cd frontend && npm run lint` (può restare 1 warning non bloccante su `analysis/page.tsx` se non fixato)
  - `cd frontend && npm run build` ✅

- **Note:**
  - `npm audit` segnala vulnerabilità high: follow-up separato (evitare `npm audit fix --force` senza review).

### Entry — 2026-01-10 (Europe/Rome) — Fix patterns markers on TradingChart + max markers configurable

- **Obiettivo:**
  - Risolvere il problema “sul chart vedo pochi/nessun pattern marker” nonostante lo store riporti molti patterns.
  - Rendere configurabile la quantità di marker visualizzati sul grafico (evitare clutter).

- **Diagnosi (root cause):**
  - `usePatternStore` conteneva ~160 `detectedPatterns`, ma `TradingChart` riceveva solo 5 patterns.
  - In `frontend/app/page.tsx` veniva passato al chart `recentPatterns`, calcolato con `.slice(0, 5)` dopo filtro per confidenza.
  - Quindi il chart faceva correttamente `patternsCount=5` e disegnava solo 5 marker.

- **Fix implementato:**
  - Separati due insiemi:
    - `recentPatterns`: usati per UI compatta (summary/list).
    - `chartPatterns`: usati per marker sul grafico.
  - `TradingChart` ora riceve `chartPatterns` (non più `recentPatterns`).

- **Migliorie (UX): max markers configurabile**
  - Aggiunto `maxChartMarkers` in `PatternDetectionSettings` (Zustand), default es. 80.
  - In dashboard applicato `slice(-max)` su `chartPatterns` (0 = illimitato).
  - Aggiunto slider in `PatternAlertsPanel` per regolare live quanti marker mostrare.

- **Note operative / Debug:**
  - Confermato che timestamps di candles/markers sono in Unix seconds e rientrano nel range delle candele: non era un problema ms vs sec.
  - Importante evitare `git add .` per non includere artefatti (`frontend/.next`, cache, env locali).

- **Intenzioni / Next (dashboard + run mode):**
  1. Rifinire con precisione la dashboard:
     - definire chiaramente cosa mostra “chart” vs “alerts panel” vs “summary” (recenti, top confidence, ecc.)
     - migliorare leggibilità marker (cap + size dinamico o grouping se necessario).
  2. Standardizzare le modalità di lancio dei server (backend+frontend):
     - documentare comandi canonici, porte e prerequisiti (DB, env).
     - eventualmente introdurre script unico (root) per avviare entrambi in dev.

## Entry — 2026-01-13 (Europe/Rome) — TradingChart stability + pattern markers + UX EMA labels

- **Obiettivo:**
  - Ripristinare marker pattern sul chart (coerenti con timeframe/range).
  - Stabilizzare TradingChart in dev (Next/React) eliminando crash `Object is disposed`.
  - Ridurre clutter e rendere la UI del chart più pulita (rimuovere label EMA dentro l’area grafico).
  - Mitigare errori backend intermittenti su `/api/paper/positions` dovuti a saturazione pool DB.

- **Cosa è cambiato (Frontend / TradingChart):**
  1. **Pattern markers**
     - Normalizzazione timestamp pattern (ms → seconds) per allineamento con `chartData.time`.
     - Ordinamento marker **ASC per time** prima di `series.setMarkers()` (requisito lightweight-charts).
     - Dedup marker con stesso timestamp per evitare duplicati e disordine.
     - Limitazione marker/clutter gestita tramite max/bucket (se configurato lato dashboard/settings).

  2. **Fix crash `Object is disposed`**
     - Cleanup robusto del chart: cancellazione corretta dei timeout pendenti (via ref), flag di disposed, e reset dei ref (`chartRef/seriesRef`) su unmount.
     - Riduzione race-condition in dev (StrictMode mount/unmount) che causava repaint su canvas già disposed.

  3. **UX: rimozione label EMA dentro il grafico**
     - Rimosso/azzerato `title` sulle serie EMA per evitare la legenda interna (“EMA 9/21/50/200”) che copriva la zona destra del grafico.

- **Cosa è cambiato (Backend):**
  - Mitigati 500 intermittenti su `/api/paper/positions` legati a `QueuePool limit ...` durante trailing stop monitoring:
    - ridotto carico/overlap nel monitor loop (lock/backoff/interval più alto).
    - (Opzionale) idle sleep quando non esistono trailing stop attivi.

- **Verifiche:**
  - `npm -w frontend run dev` avvio OK; chart stabile in refresh/cambio contesto senza crash `Object is disposed`.
  - Marker pattern visibili e coerenti con timeframe.
  - Backend: `/api/paper/positions` stabile (no 500) in test prolungato.

- **Next:**
  - Rifinire default di `maxChartMarkers` / `markerBucketSeconds` per pulizia out-of-the-box.
  - Se necessario: rendere “idle sleep” trailing-stop parametrico via env/config.

## 2026-01-15 — Desktop UI compaction + R1/R2/R8 refactor + IndicatorPanel compact/expand

### Obiettivi
- Compattare layout desktop (ridurre padding/gap) per dare più spazio al chart.
- Eliminare riquadro R3 (Watchlist) ritenuto ridondante: la selezione crypto avviene via click sul simbolo (R2) e preset/favorites.
- Spostare i controlli TF/EMA/Config da R2 alla barra sotto-chart R8.
- Rendere R6 (Technical Indicators) più compatto, con dettagli espandibili al click.

### Modifiche UI / Frontend
- **Header globale (R1)**:
  - Aggiunta pill separata per modalità (PAPER/REAL) vicino a Connection Status.
  - Aggiunto bottone PANIC sempre visibile con conferma (placeholder operativo).
  - Compattati padding/height per ridurre l’altezza complessiva.
- **Balance/Equity in header**:
  - Equity calcolata come `availableBalance + totalUnrealizedPnL`.
  - Percentuale calcolata vs equity di inizio giornata (snapshot in localStorage, reset a cambio giorno).
- **R2 UnifiedPriceHeader**:
  - Semplificato: simbolo + prezzo + % + favorites.
  - Prezzo formattato con separatore migliaia via `formatCurrency()` (locale it-IT).
  - Rimossi TF/EMA/Config (spostati in R8).
- **R8 ChartBottomBar**:
  - Aggiunti bottoni TF: 1m 5m 15m 30m 1h 4h 1d.
  - Aggiunti toggle EMA (9/21/50/200) con indicatori trend (↑/↓/—).
  - Bottone Config per aprire la configurazione EMA.
- **Layout Desktop**:
  - Grid modificata a **2-8-2** (sinistra-centro-destra) per massimizzare area chart.
  - Compattazione spazi: `p-2`, `gap-2`, `space-y-2`.
  - Rimosso componente WatchListPanel dalla colonna sinistra.
- **IndicatorPanel (R6)**:
  - Aggiunta modalità `compact` e comportamento “click-to-expand” per RSI/MACD/Bollinger.
  - Fix type error: `rsi.signal.condition` non esiste → usare `rsi.signal.description`.

### Fix / Note tecniche
- TypeScript/Next build error risolto:
  - `Property 'condition' does not exist on type { signal, description, color }`
  - patch: usare `description` per mostrare testo dettagli RSI.

### Verifiche eseguite / da eseguire
- Frontend:
  - `npm -w frontend run build`
  - `npm -w frontend run lint` (opzionale)
  - Verifica manuale: click espansione indicatori; TF/EMA in R8; PANIC confirm.
- Backend: nessuna modifica funzionale lato API in questa sessione.
