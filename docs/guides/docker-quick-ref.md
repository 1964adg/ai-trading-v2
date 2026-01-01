# Docker Quick Reference

## 🚀 Quick Start

```bash
# Development environment (one command)
./scripts/dev-setup.sh

# Access services
Frontend:  http://localhost:3000
Backend:   http://localhost:8000
Database:  localhost:5432 (user: trader, pass: secure_pass)
Redis:     localhost:6379
```

## 🔧 Common Commands

### Start/Stop Services
```bash
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose restart            # Restart all services
docker compose restart backend    # Restart specific service
```

### View Logs
```bash
docker compose logs -f            # All services (follow)
docker compose logs backend       # Backend logs
docker compose logs frontend      # Frontend logs
docker compose logs -f --tail=50  # Last 50 lines, follow
```

### Shell Access
```bash
docker compose exec backend sh    # Backend shell
docker compose exec frontend sh   # Frontend shell
docker compose exec postgres psql -U trader -d trading_ai  # Database
docker compose exec redis redis-cli  # Redis CLI
```

### Rebuild Services
```bash
docker compose up --build -d      # Rebuild all
docker compose up --build -d backend  # Rebuild specific service
docker compose build --no-cache   # Force rebuild without cache
```

## 🗄️ Database Operations

```bash
# Connect to database
docker compose exec postgres psql -U trader -d trading_ai

# Backup database
docker compose exec postgres pg_dump -U trader trading_ai > backup.sql

# Restore database
cat backup.sql | docker compose exec -T postgres psql -U trader -d trading_ai

# Check database status
docker compose exec postgres pg_isready -U trader
```

## 🔍 Debugging

```bash
# Check service status
docker compose ps

# Check resource usage
docker stats

# View service health
docker compose ps | grep "healthy"

# Inspect service
docker compose exec backend env  # View environment variables
docker compose exec backend python -c "from config import settings; print(settings)"
```

## 🧹 Cleanup

```bash
# Stop and remove containers
docker compose down

# Remove containers and volumes (⚠️ DELETES DATA)
docker compose down -v

# Clean up unused resources
docker system prune -a --volumes

# Remove specific volume
docker volume rm ai-trading-v2_postgres_data
```

## 🔄 Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose down
docker compose up --build -d

# Or use script
./scripts/dev-setup.sh
```

## ⚙️ Configuration

### Environment Variables
```bash
# Edit configuration
nano .env

# Restart to apply changes
docker compose restart
```

### Port Changes
```bash
# Edit docker-compose.yml or create docker-compose.override.yml
services:
  frontend:
    ports:
      - "3001:3000"  # Use port 3001 instead
```

## 🚨 Troubleshooting

### Port Conflicts
```bash
# Check what's using port
lsof -i :3000
lsof -i :8000

# Change port in docker-compose.yml or stop conflicting service
```

### Frontend Won't Start
```bash
# View logs
docker compose logs frontend

# Rebuild
docker compose up --build -d frontend

# Clear node_modules
docker compose down
docker volume rm ai-trading-v2_frontend_node_modules  # If exists
docker compose up --build -d
```

### Backend Won't Start
```bash
# View logs
docker compose logs backend

# Check database connection
docker compose exec postgres pg_isready -U trader

# Rebuild
docker compose up --build -d backend
```

### Database Issues
```bash
# Check postgres logs
docker compose logs postgres

# Restart postgres
docker compose restart postgres

# Reset database (⚠️ DELETES DATA)
docker compose down
docker volume rm ai-trading-v2_postgres_data
docker compose up -d
```

## 📊 Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Frontend health (in browser)
http://localhost:3000

# Database health
docker compose exec postgres pg_isready -U trader

# Redis health
docker compose exec redis redis-cli ping
```

## 🔒 Security

```bash
# View container logs for security issues
docker compose logs | grep -i error

# Check for vulnerabilities (if trivy installed)
trivy image ai-trading-v2-backend

# Update base images
docker compose pull
docker compose up --build -d
```

## 📈 Production

```bash
# Deploy to production
./scripts/prod-deploy.sh

# Use production compose file
docker compose -f docker-compose.prod.yml up -d

# Check production health
curl http://localhost:8000/
```

## 🆘 Emergency

### Complete Reset
```bash
# Stop everything
docker compose down -v

# Remove all Docker data (⚠️ NUCLEAR OPTION)
docker system prune -a --volumes

# Start fresh
./scripts/dev-setup.sh
```

### Rollback to Traditional Setup
```bash
# Stop Docker
docker compose down

# Start traditional way
cd backend && python main.py  # Terminal 1
cd frontend && npm run dev     # Terminal 2
```

## 📚 Documentation

- **Setup**: [DOCKER_README.md](./DOCKER_README.md)
- **Migration**: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **Testing**: [DOCKER_TESTING.md](./DOCKER_TESTING.md)
- **Summary**: [IMPLEMENTATION_SUMMARY_DOCKER.md](./IMPLEMENTATION_SUMMARY_DOCKER.md)

## 🎯 Useful Aliases (Optional)

Add to your `.bashrc` or `.zshrc`:

```bash
alias dc='docker compose'
alias dcu='docker compose up -d'
alias dcd='docker compose down'
alias dcl='docker compose logs -f'
alias dcr='docker compose restart'
alias dcp='docker compose ps'
alias dcb='docker compose build'

# Trading specific
alias trading-start='./scripts/dev-setup.sh'
alias trading-logs='docker compose logs -f backend frontend'
alias trading-db='docker compose exec postgres psql -U trader -d trading_ai'
```

---

**Quick Help**: `./scripts/validate-docker.sh` to verify setup  
**Emergency**: `docker compose down && ./scripts/dev-setup.sh`
