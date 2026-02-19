# AI Trading V2 - Docker Containerization Guide

## 🚀 Quick Start

### Development Environment

1. **Clone the repository**
   ```bash
   git clone https://github.com/1964adg/ai-trading-v2.git
   cd ai-trading-v2
   ```

2. **Run the setup script**
   ```bash
   ./scripts/dev-setup.sh
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Database: localhost:5432
   - Redis: localhost:6379

### Manual Setup

If you prefer to run commands manually:

```bash
# Create environment file
cp .env.example .env

# Build and start services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📁 Architecture Overview

```
ai-trading-v2/
├── frontend/              # Next.js frontend application
│   ├── Dockerfile         # Development image
│   └── Dockerfile.prod    # Production image
├── backend/               # FastAPI backend application
│   ├── Dockerfile         # Development image
│   └── Dockerfile.prod    # Production image
├── infrastructure/        # Infrastructure configuration
│   ├── database/          # Database schemas and migrations
│   │   └── init.sql       # TimescaleDB initialization
│   ├── nginx/             # Nginx configuration
│   │   ├── nginx.conf     # Main nginx config
│   │   └── frontend.conf  # Frontend-specific config
│   └── kubernetes/        # Kubernetes manifests (future)
├── scripts/               # Utility scripts
│   ├── dev-setup.sh       # Development environment setup
│   └── prod-deploy.sh     # Production deployment
├── docker-compose.yml     # Development orchestration
└── docker-compose.prod.yml # Production orchestration
```

## 🔧 Services

### Frontend (Next.js)
- **Port**: 3000
- **Technology**: Next.js 14, React 18, TypeScript
- **Features**: Trading UI, Real-time charts, Keyboard shortcuts (F1/F2)

### Backend (FastAPI)
- **Port**: 8000
- **Technology**: Python 3.11, FastAPI, Uvicorn
- **Features**: REST API, WebSocket support, Binance integration

### PostgreSQL (TimescaleDB)
- **Port**: 5432
- **Technology**: TimescaleDB (PostgreSQL extension)
- **Features**: Time-series optimization, Data retention, Compression

### Redis
- **Port**: 6379
- **Technology**: Redis 7
- **Features**: Caching, Session storage, Real-time data

## 🛠️ Common Operations

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
```

### Shell Access
```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh

# Database shell
docker-compose exec postgres psql -U trader -d trading_ai

# Redis CLI
docker-compose exec redis redis-cli
```

### Database Operations
```bash
# Connect to database
docker-compose exec postgres psql -U trader -d trading_ai

# Backup database
docker-compose exec postgres pg_dump -U trader trading_ai > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U trader -d trading_ai
```

### Rebuild Services
```bash
# Rebuild all services
docker-compose up --build -d

# Rebuild specific service
docker-compose up --build -d backend
```

### Clean Up
```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes (⚠️ WARNING: Deletes data!)
docker-compose down -v

# Remove all unused Docker resources
docker system prune -a --volumes
```

## 🔒 Environment Configuration

The `.env` file contains all configuration variables. Key settings:

### Database
```env
DATABASE_URL=postgresql://trader:secure_pass@localhost:5432/trading_ai
```

### API Configuration
```env
PORT=8000
CORS_ORIGINS=http://localhost:3000
```

### Trading Mode
```env
PAPER_TRADING=true  # true = simulated, false = real trading
```

### Feature Flags
```env
ENABLE_MICROSERVICES=false
ENABLE_AI_PREDICTIONS=false
ENABLE_PATTERN_LEARNING=true
```

## 🚀 Production Deployment

### Prerequisites
- Docker and Docker Compose installed
- Domain name configured (optional)
- SSL certificates (for HTTPS)

### Deployment Steps

1. **Update environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Configure SSL (optional)**
   - Place certificates in `infrastructure/nginx/ssl/`
   - Update `infrastructure/nginx/nginx.conf` for HTTPS

3. **Deploy**
   ```bash
   ./scripts/prod-deploy.sh
   ```

   Or manually:
   ```bash
   docker-compose -f docker-compose.prod.yml up --build -d
   ```

4. **Verify deployment**
   ```bash
   curl http://localhost:8000/
   ```

### Production Configuration

Edit `docker-compose.prod.yml` for production-specific settings:
- Environment variables from `.env`
- Resource limits
- Restart policies
- Health checks

## 📊 Database Schema

The system uses TimescaleDB for time-series data optimization:

### Tables
- **market_data**: OHLCV data with indicators (hypertable)
- **pattern_detections**: Pattern recognition results
- **ai_predictions**: AI model predictions and accuracy
- **user_sessions**: User authentication (future)
- **trading_audit**: Trading activity logs (hypertable)

### Features
- **Hypertables**: Optimized for time-series queries
- **Retention policies**: Automatic data cleanup
- **Compression**: Automatic compression of old data
- **Indexes**: Optimized for trading queries

## 🔍 Monitoring

### Health Checks
```bash
# Backend health
curl http://localhost:8000/

# Nginx health
curl http://localhost/health

# Database
docker-compose exec postgres pg_isready -U trader

# Redis
docker-compose exec redis redis-cli ping
```

### Resource Usage
```bash
# View container stats
docker stats

# View disk usage
docker system df
```

## 🐛 Troubleshooting

### Frontend not accessible
```bash
# Check frontend logs
docker-compose logs frontend

# Check if container is running
docker-compose ps

# Rebuild frontend
docker-compose up --build -d frontend
```

### Backend API errors
```bash
# Check backend logs
docker-compose logs backend

# Verify database connection
docker-compose exec backend python -c "from backend.config import settings; print(settings)"

# Restart backend
docker-compose restart backend
```

### Database connection issues
```bash
# Check if database is running
docker-compose exec postgres pg_isready -U trader

# View database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Port conflicts
If ports 3000, 8000, 5432, or 6379 are already in use:

1. Stop conflicting services
2. Or modify port mappings in `docker-compose.yml`

### Out of disk space
```bash
# Remove unused Docker resources
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

## 🔄 Migration from Non-Docker Setup

### Backward Compatibility
The Docker setup maintains 100% backward compatibility:
- Same API endpoints
- Same frontend functionality
- Same keyboard shortcuts (F1/F2)
- Same trading features

### Migration Steps
1. Backup your current data
2. Install Docker
3. Run `./scripts/dev-setup.sh`
4. Verify all features work
5. Migrate data if needed

### Rollback
Keep your original setup as backup in case of issues:
```bash
# Stop Docker services
docker-compose down

# Start original services
cd backend && python main.py
cd frontend && npm run dev
```

## 📝 Development Workflow

### Hot Reload
Both frontend and backend support hot reload in development:
- Frontend: Changes to `.tsx`, `.ts` files auto-reload
- Backend: Changes to `.py` files auto-reload

### Adding Dependencies

**Frontend:**
```bash
docker-compose exec frontend npm install <package>
```

**Backend:**
```bash
# Add to requirements.txt, then:
docker-compose up --build -d backend
```

### Running Tests

**Frontend:**
```bash
docker-compose exec frontend npm test
```

**Backend:**
```bash
docker-compose exec backend pytest
```

## 🎯 Next Steps

1. **Microservices Migration**: Extract services (Phase 2-5)
2. **Kubernetes**: Deploy to Kubernetes cluster
3. **Monitoring**: Add Prometheus and Grafana
4. **CI/CD**: Set up automated deployments
5. **Cripto-Scout AI**: Integrate AI service

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs: `docker-compose logs -f`
3. Open an issue on GitHub
4. Contact the development team

---

**Version**: 1.0.0
**Last Updated**: 2025-12-07
**Status**: Production Ready ✅
