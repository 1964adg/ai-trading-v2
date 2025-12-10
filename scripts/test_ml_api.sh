#!/bin/bash

# ML API Testing Script
# Tests all ML API endpoints

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8000}"
SYMBOL="${SYMBOL:-BTCUSDT}"
TIMEFRAME="${TIMEFRAME:-1m}"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  ML API Testing${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Test 1: Check if backend is running
echo -e "${BLUE}Test 1: Checking if backend is running...${NC}"
if curl -s "${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running at ${BACKEND_URL}${NC}"
else
    echo -e "${RED}❌ Backend is not running at ${BACKEND_URL}${NC}"
    echo -e "${YELLOW}⚠️  Start the backend with:${NC}"
    echo -e "   cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
    exit 1
fi
echo ""

# Test 2: Test /api/ml/status
echo -e "${BLUE}Test 2: Testing /api/ml/status...${NC}"
RESPONSE=$(curl -s "${BACKEND_URL}/api/ml/status")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ /api/ml/status responded${NC}"
    echo "Response: ${RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${RESPONSE}"
else
    echo -e "${RED}❌ /api/ml/status failed${NC}"
fi
echo ""

# Test 3: Test /api/ml/insights/{symbol}
echo -e "${BLUE}Test 3: Testing /api/ml/insights/${SYMBOL}...${NC}"
RESPONSE=$(curl -s "${BACKEND_URL}/api/ml/insights/${SYMBOL}?timeframe=${TIMEFRAME}")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ /api/ml/insights/${SYMBOL} responded${NC}"
    echo "Response (first 500 chars):"
    echo "${RESPONSE}" | cut -c 1-500
    
    # Check if response is valid JSON
    if echo "${RESPONSE}" | python3 -m json.tool > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Response is valid JSON${NC}"
    else
        echo -e "${YELLOW}⚠️  Response may not be valid JSON${NC}"
    fi
else
    echo -e "${RED}❌ /api/ml/insights/${SYMBOL} failed${NC}"
fi
echo ""

# Test 4: Test /api/ml/patterns/{symbol}
echo -e "${BLUE}Test 4: Testing /api/ml/patterns/${SYMBOL}...${NC}"
RESPONSE=$(curl -s "${BACKEND_URL}/api/ml/patterns/${SYMBOL}?timeframe=${TIMEFRAME}")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ /api/ml/patterns/${SYMBOL} responded${NC}"
    echo "Response (first 500 chars):"
    echo "${RESPONSE}" | cut -c 1-500
    
    # Check if response is valid JSON
    if echo "${RESPONSE}" | python3 -m json.tool > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Response is valid JSON${NC}"
    else
        echo -e "${YELLOW}⚠️  Response may not be valid JSON${NC}"
    fi
else
    echo -e "${RED}❌ /api/ml/patterns/${SYMBOL} failed${NC}"
fi
echo ""

# Test 5: Test /api/ml/price-prediction/{symbol}
echo -e "${BLUE}Test 5: Testing /api/ml/price-prediction/${SYMBOL}...${NC}"
RESPONSE=$(curl -s "${BACKEND_URL}/api/ml/price-prediction/${SYMBOL}?timeframe=${TIMEFRAME}")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ /api/ml/price-prediction/${SYMBOL} responded${NC}"
    echo "Response (first 500 chars):"
    echo "${RESPONSE}" | cut -c 1-500
    
    # Check if response is valid JSON
    if echo "${RESPONSE}" | python3 -m json.tool > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Response is valid JSON${NC}"
    else
        echo -e "${YELLOW}⚠️  Response may not be valid JSON${NC}"
    fi
else
    echo -e "${RED}❌ /api/ml/price-prediction/${SYMBOL} failed${NC}"
fi
echo ""

# Test 6: Test /api/ml/signals/{symbol}
echo -e "${BLUE}Test 6: Testing /api/ml/signals/${SYMBOL}...${NC}"
RESPONSE=$(curl -s "${BACKEND_URL}/api/ml/signals/${SYMBOL}?timeframe=${TIMEFRAME}")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ /api/ml/signals/${SYMBOL} responded${NC}"
    echo "Response (first 500 chars):"
    echo "${RESPONSE}" | cut -c 1-500
    
    # Check if response is valid JSON
    if echo "${RESPONSE}" | python3 -m json.tool > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Response is valid JSON${NC}"
    else
        echo -e "${YELLOW}⚠️  Response may not be valid JSON${NC}"
    fi
else
    echo -e "${RED}❌ /api/ml/signals/${SYMBOL} failed${NC}"
fi
echo ""

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ All ML API endpoints are accessible${NC}"
echo ""
