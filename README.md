# ai-trading-v2

Piattaforma avanzata per trading algoritmico, analytics e machine learning.  
Backend solo PostgreSQL, struttura pulita, frontend React/TypeScript.

---

## 🚀 Quick Start

### 1. Clona la repo
```bash
git clone https://github.com/1964adg/ai-trading-v2.git
cd ai-trading-v2
```

### 2. Crea/modifica il file `.env`
```env
DATABASE_URL=postgresql+psycopg2://trader:Adgpassword64!@localhost:5433/ai_trading
PORT=8000
CORS_ORIGINS=http://localhost:3000
```

### 3. Installa le dipendenze Python
```bash
pip install -r backend/requirements.txt
```

### 4. Avvia il backend (FastAPI + Uvicorn con hot reload)
```bash
python -m uvicorn backend.main:app --reload
```
Backend su [http://localhost:8000](http://localhost:8000)

### 5. Avvia il frontend (React/TypeScript)
```bash
npm -w frontend run dev
```
Dashboard su [http://localhost:3000](http://localhost:3000)

### 6. Health check backend
```bash
curl http://localhost:8000/health
```

---

## 🗂 Struttura

Vedi [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) per mappa file/cartelle.  
Tutti i modelli sono ORM single Base SQLAlchemy e PostgreSQL.

---

## 📝 Documentazione

- [DATABASE.md](backend/DATABASE.md)
- [PATTERN_STORE_IMPLEMENTATION.md](PATTERN_STORE_IMPLEMENTATION.md)
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## 🤝 Contribuisci

Pull request e issue benvenute!  
Repo: [github.com/1964adg/ai-trading-v2](https://github.com/1964adg/ai-trading-v2)

---

## 🏷️ Stato

- 🟢 Backend refactor completato (solo PostgreSQL, pulizia)
- 🟢 Struttura project aggiornata, onboarding semplice
- 🔵 Documentazione in evoluzione
