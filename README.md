# ai-trading-v2

ai-trading-v2 è una piattaforma avanzata per trading algoritmico, pattern recognition, analytics e machine learning su mercati crypto e finanziari.

---

## **Features principali**

- **Trading automatico** (live e paper trading)
- **Pattern recognition** con caching, metriche e score
- **Machine Learning** (backtest, predizioni, metriche model)
- **Dashboard analytics**: metriche aggregate e visualizzazioni
- **Gestione multi-strategy** e multi timeframe
- **Schema database unificato** per scalabilità e facilità di sviluppo

---

## **Struttura Progetto**

```plaintext
backend/
    models/                # Tutti i modelli ORM SQLAlchemy
        base.py           # Unico Base ORM (centralizzato)
        position.py       # Trading Position
        order.py          # Trading Order
        portfolio_snapshot.py
        orderbook.py
        custom_symbols.py
        candlestick.py
        pattern.py        # PatternCache, TradeExecutionLog, MLModelResult, AnalyticsMetrics
        __init__.py       # Import/export modelli principali
    api/                   # Endpoint e router REST
    lib/                   # Utility, DB engine, gestione sessioni
    services/              # Business - trading, scouting, paper
    app/                   # ML training, routers, websocket, scout
    migrations/            # Script SQL/DB evolutivi
    utils/                 # Utility Binance, helper vari
    main.py                # Entry point backend
frontend/                  # Dashboard, gestione backtesting e view metriche
docs/                      # Documentazione estesa
data/, scripts/, infrastructure/  # Storage, automate, container ecc.
```

---

## **Modelli chiave Database**

| Modello             | Descrizione                                           |
|---------------------|-------------------------------------------------------|
| Position            | Posizioni trading (aperta, chiusa)                    |
| Order               | Ordini piazzati/associati a position                  |
| PortfolioSnapshot   | Stato aggregato portafoglio                           |
| OrderbookSnapshot   | Snapshot orderbook deep levels                        |
| CustomSymbol        | Alias custom utente                                   |
| Candlestick         | Dati OHLCV                                             |
| CandlestickMetadata | Disponibilità/sync candlestick                        |
| PatternCache        | Riconoscimento pattern, metriche e caching            |
| TradeExecutionLog   | Log trade eseguiti (latency, slippage, status)        |
| MLModelResult       | Predizioni e metriche ML                              |
| AnalyticsMetrics    | Metriche aggregate dashboard                          |

Tutte le classi ereditano da un **unico Base SQLAlchemy** (`backend/models/base.py`)
→ massima compatibilità e facilità di estensione/migrazione.

---

## **Potenzialità e stato attuale**

- **Refactor completato:** ora il backend è 100% single-Base ORM
- Schema DB stabile e scalabile (no problemi di metadata multiple, tabelle mancanti)
- Funzioni di health check, creazione tabelle interattiva, logging avanzato
- Pronto per deployment, test trading, evoluzione ML
- Frontend React/TypeScript in sviluppo per dashboard live e strumenti analitici

---

## **Criticità risolte**

- Eliminato multiple SQLAlchemy Base → refactor totale pattern/candlestick/orderbook
- Migliorata creazione tabelle, uniformato schema, import massivo in `__init__.py`
- Consolidamento modelli e gestione tabelle ORM

---

## **Prossime evoluzioni**

- Alembic o tool di migrazione schema DB per evoluzioni future
- Aumento performance su tabelle grandi (candlestick, orderbook)
- Aggiunta validazione input/output e preprocessing ML
- Estensione strategia trading, pattern custom e operatività live

---

## **Documentazione di approfondimento**

- [DATABASE.md](backend/DATABASE.md): schema logico completo
- [PATTERN_STORE_ARCHITECTURE.md](PATTERN_STORE_ARCHITECTURE.md): architettura pattern
- [PATTERN_STORE_IMPLEMENTATION.md](PATTERN_STORE_IMPLEMENTATION.md): implementazione effettiva
- [README.md](README.md): questa overview

---

## **Installazione**

- Configura `.env` in base ai parametri Postgres e API
- Installazione Python:
    ```bash
    pip install -r backend/requirements.txt
    ```
- Avvia backend:
    ```bash
    python backend/main.py
    ```

---

## **Contribuisci**

Pull request e issue benvenute!
Contatta il maintainer principale o apri una issue su GitHub.

---
