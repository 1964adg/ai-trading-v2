#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}🚀 AI Trading V2 - Development Environment Setup${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed${NC}"

# Detect docker-compose command (v1 vs v2)
DOCKER_COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
fi
echo -e "${GREEN}✅ Using: $DOCKER_COMPOSE_CMD${NC}"

# Create .env from example if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file from example${NC}"
    echo -e "${YELLOW}⚠️  Please review and update .env file with your configuration${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists, skipping creation${NC}"
fi

echo ""
echo -e "${BLUE}Building and starting Docker containers...${NC}"

# Stop any existing containers
$DOCKER_COMPOSE_CMD down 2>/dev/null || true

# Build and start containers
$DOCKER_COMPOSE_CMD up --build -d

echo ""
echo -e "${GREEN}✅ Containers started successfully${NC}"
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}📊 Service URLs:${NC}"
echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}🌐 Frontend:  ${NC}http://localhost:3000"
echo -e "${GREEN}🔗 Backend:   ${NC}http://localhost:8000"
echo -e "${GREEN}📊 Database:  ${NC}localhost:5432"
echo -e "${GREEN}🔴 Redis:     ${NC}localhost:6379"
echo ""

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 15

# Check service health
echo ""
echo -e "${BLUE}Checking service health...${NC}"

# Check backend health
if curl -f http://localhost:8000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend is starting... (may take a few more seconds)${NC}"
fi

# Check postgres
if $DOCKER_COMPOSE_CMD exec postgres pg_isready -U trader > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL is starting...${NC}"
fi

# Check redis
if $DOCKER_COMPOSE_CMD exec redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Redis is starting...${NC}"
fi

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}📝 Useful Commands:${NC}"
echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}View logs:        ${NC}$DOCKER_COMPOSE_CMD logs -f"
echo -e "${GREEN}Stop services:    ${NC}$DOCKER_COMPOSE_CMD down"
echo -e "${GREEN}Restart services: ${NC}$DOCKER_COMPOSE_CMD restart"
echo -e "${GREEN}Shell into backend:${NC}$DOCKER_COMPOSE_CMD exec backend sh"
echo -e "${GREEN}Shell into frontend:${NC}$DOCKER_COMPOSE_CMD exec frontend sh"
echo -e "${GREEN}Database shell:   ${NC}$DOCKER_COMPOSE_CMD exec postgres psql -U trader -d trading_ai"
echo ""

echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${YELLOW}Note: If this is your first time running, the frontend may take${NC}"
echo -e "${YELLOW}      a minute to install dependencies and start.${NC}"
echo ""
