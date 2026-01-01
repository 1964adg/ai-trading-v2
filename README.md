# AI Trading V2
"AI Trading Dashboard - Paper Trading Crypto (MVP Reboot)"

## 🚀 Quick Start with Docker

The fastest way to get started is using Docker:

```bash
./scripts/dev-setup.sh
```

Then access:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000

For detailed Docker setup and deployment instructions, see [DOCKER_README.md](./DOCKER_README.md).

## 📋 Features

- **Real-time Trading**: Paper trading with real market data from Binance
- **Keyboard Shortcuts**: F1/F2 for quick trading actions
- **Pattern Recognition**: Advanced chart pattern detection
- **Real-time Data**: Live candlestick data and market analysis
- **Containerized**: Full Docker support for easy deployment

## 🏗️ Architecture

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python 3.11
- **Database**: PostgreSQL with TimescaleDB (for time-series data)
- **Cache**: Redis
- **Container Orchestration**: Docker Compose

## 📖 Documentation

For complete documentation, see [📚 Documentation Hub](./docs/README.md)

**Quick Links:**
- [Docker Setup Guide](./docs/guides/docker.md) - Containerization and deployment
- [Keyboard Shortcuts](./docs/guides/shortcuts.md) - F1/F2 shortcuts guide
- [Backtesting Guide](./docs/guides/backtesting.md) - Trading strategy backtesting
- [Indicators Guide](./docs/guides/indicators.md) - Technical indicators
- [Testing Guide](./docs/guides/testing.md) - Test procedures
- [API Documentation](./docs/api/) - API references
- [Architecture](./docs/architecture/) - System architecture

## 🛠️ Development

### With Docker (Recommended)
```bash
# Start development environment
./scripts/dev-setup.sh

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

For detailed instructions, see [Docker Guide](./docs/guides/docker.md).

### Without Docker (Traditional)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📊 Database Schema

The system includes a comprehensive database schema optimized for trading data:
- Market data with OHLCV and indicators (time-series optimized)
- Pattern detection results
- AI predictions tracking
- Trading audit logs

See [infrastructure/database/init.sql](./infrastructure/database/init.sql) for details.

## 🔒 Security

- Paper trading mode enabled by default
- Environment-based configuration
- CORS protection
- SQL injection prevention
- Secure credential management

## 🚀 Production Deployment

For production deployment with SSL and monitoring:

```bash
./scripts/prod-deploy.sh
```

See [Docker Guide](./docs/guides/docker.md) for complete production setup instructions.

## 🔄 Roadmap

- [x] Docker containerization
- [x] Database schema for microservices
- [x] Development and production configurations
- [ ] Kubernetes deployment
- [ ] Microservices migration (Phase 2-5)
- [ ] Cripto-Scout AI integration
- [ ] Advanced monitoring and alerting

## 📝 License

Private repository - All rights reserved.

---

**Status**: Production Ready ✅  
**Version**: 1.0.0  
**Last Updated**: 2025-12-07
