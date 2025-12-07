#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}🚀 AI Trading V2 - Production Deployment${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Detect docker-compose command
DOCKER_COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found. Please create one from .env.example${NC}"
    exit 1
fi

# Confirm production deployment
echo -e "${YELLOW}⚠️  WARNING: This will deploy to PRODUCTION environment${NC}"
echo -e "${YELLOW}⚠️  Make sure you have:${NC}"
echo -e "${YELLOW}    - Updated .env with production values${NC}"
echo -e "${YELLOW}    - Configured SSL certificates (if using HTTPS)${NC}"
echo -e "${YELLOW}    - Backed up your database${NC}"
echo ""
read -p "Continue with production deployment? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Building production images...${NC}"

# Build production images
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml build

echo ""
echo -e "${BLUE}Starting production services...${NC}"

# Start production services
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d

echo ""
echo -e "${GREEN}✅ Production deployment started${NC}"
echo ""

# Wait for services
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 20

# Check health
echo ""
echo -e "${BLUE}Checking service health...${NC}"

BACKEND_HOST="${BACKEND_HOST:-localhost}"

if curl -f "http://${BACKEND_HOST}:8000/" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}🎉 Production deployment complete!${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "${YELLOW}1. Configure your domain DNS to point to this server${NC}"
echo -e "${YELLOW}2. Set up SSL certificates (Let's Encrypt recommended)${NC}"
echo -e "${YELLOW}3. Configure nginx HTTPS settings${NC}"
echo -e "${YELLOW}4. Set up monitoring and alerting${NC}"
echo -e "${YELLOW}5. Configure database backups${NC}"
echo ""
echo -e "${GREEN}View logs: ${NC}$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml logs -f"
echo ""
