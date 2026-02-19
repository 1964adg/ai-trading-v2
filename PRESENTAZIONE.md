# ai-trading-v2 – Presentazione aggiornata

---

## 🚀 Cos’è ai-trading-v2

Piattaforma avanzata per trading algoritmico, pattern recognition, analytics e machine learning su mercati crypto e finanziari.

---

## 🔑 Features principali

- Trading automatico multi-strategy (live & paper)
- Pattern recognition, caching, metriche, scoring
- Analytics & dashboard (PNL, log, visualizzazione)
- Machine Learning integrato: predizione, backtest
- Scalabile & estendibile, backend SQLAlchemy su PostgreSQL

---

## ⚙️ Architettura

### **Backend**
- **Unico schema SQLAlchemy Base:** tutti i modelli vanno su PostgreSQL
- **Configurazione centralizzata:** DATABASE_URL via `.env`
- **API:** FastAPI, endpoints per trading, dati, analytics
- **Services:** trading engine, pattern manager, ML training

### **Frontend**
- Dashboard React/TypeScript, gestione asset, strategie & metriche
- Backtesting manager, visualizzazione PNL, pattern, log

---

## 📦 Struttura progetto

```plaintext
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

---

## 🔗 Setup & Avvio Rapido

1. **Clona la repo**
    ```bash
    git clone https://github.com/1964adg/ai-trading-v2.git
    cd ai-trading-v2
    ```

2. **Configura `.env` (esempio)**
    ```env
    DATABASE_URL=postgresql+psycopg2://trader:Adgpassword64!@localhost:5433/ai_trading
    PORT=8000
    CORS_ORIGINS=http://localhost:3000
    ```

3. **Installa dipendenze Python**
    ```bash
    pip install -r backend/requirements.txt
    ```

4. **Avvia backend (FastAPI/Uvicorn con reload)**
    ```bash
    python -m uvicorn backend.main:app --reload
    ```

5. **Avvia frontend (React/TypeScript)**
    ```bash
    npm -w frontend run dev
    ```

6. **Health check backend**
    ```bash
    curl http://localhost:8000/health
    ```

---

## 🧾 Documentazione

- README.md, DATABASE.md: struttura, onboarding, schema logico (aggiornati)
- PROJECT_STRUCTURE.md: mappa file/cartelle
- PATTERN_STORE_IMPLEMENTATION.md: spiegazione pattern (single base)

---

## 🏷️ Stato

- ✅ Refactor completato: backend solo PostgreSQL
- ✅ Modelli, struttura, configuration allineate
- 🟢 Pronto per production, test, extension ML/frontend

---

## 🤝 Contribuzione & Supporto

Pull request, issue, domande tecniche benvenute!  
Maintainer: [github.com/1964adg/ai-trading-v2](https://github.com/1964adg/ai-trading-v2)
