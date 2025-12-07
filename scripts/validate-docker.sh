#!/bin/bash
# Quick validation script for Docker setup

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "Docker Configuration Validation"
echo "========================================"
echo ""

# Test 1: Check Docker is available
echo -n "✓ Checking Docker installation... "
if command -v docker &> /dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo "Docker is not installed"
    exit 1
fi

# Test 2: Check Docker Compose
echo -n "✓ Checking Docker Compose... "
if docker compose version &> /dev/null || command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo "Docker Compose is not installed"
    exit 1
fi

# Test 3: Validate docker-compose.yml
echo -n "✓ Validating docker-compose.yml... "
if ! docker compose config > /dev/null 2>&1; then
    echo -e "${RED}FAIL${NC}"
    docker compose config
    exit 1
else
    echo -e "${GREEN}OK${NC}"
fi

# Test 4: Validate docker-compose.prod.yml
echo -n "✓ Validating docker-compose.prod.yml... "
if ! docker compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
    echo -e "${RED}FAIL${NC}"
    docker compose -f docker-compose.prod.yml config
    exit 1
else
    echo -e "${GREEN}OK${NC}"
fi

# Test 5: Check Dockerfile syntax
echo -n "✓ Checking Dockerfiles... "
if [ -f "backend/Dockerfile" ] && [ -f "frontend/Dockerfile" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo "Dockerfiles are missing"
    exit 1
fi

# Test 6: Check .env.example exists
echo -n "✓ Checking .env.example... "
if [ -f ".env.example" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo ".env.example is missing"
    exit 1
fi

# Test 7: Check scripts exist
echo -n "✓ Checking setup scripts... "
if [ -f "scripts/dev-setup.sh" ] && [ -f "scripts/prod-deploy.sh" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo "Setup scripts are missing"
    exit 1
fi

# Test 8: Check infrastructure files
echo -n "✓ Checking infrastructure files... "
if [ -f "infrastructure/database/init.sql" ] && [ -f "infrastructure/nginx/nginx.conf" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo "Infrastructure files are missing"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}All validation checks passed!${NC}"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure"
echo "2. Run ./scripts/dev-setup.sh to start"
echo ""
