#!/bin/bash

# Script per verificare che il deploy sia andato a buon fine
# Utilizzo: ./scripts/verify-deployment.sh [URL]

URL=${1:-"http://localhost:3000"}

echo "🔍 Verifying deployment at $URL"
echo "================================"

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Contatori
PASSED=0
FAILED=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="$3"

    echo -n "Testing $test_name... "

    if eval "$test_command" &>/dev/null; then
        if [ -n "$expected_status" ]; then
            status_code=$(curl -s -o /dev/null -w "%{http_code}" "$URL$expected_status")
            if [ "$status_code" = "200" ]; then
                echo -e "${GREEN}✅ PASSED${NC}"
                ((PASSED++))
            else
                echo -e "${RED}❌ FAILED (HTTP $status_code)${NC}"
                ((FAILED++))
            fi
        else
            echo -e "${GREEN}✅ PASSED${NC}"
            ((PASSED++))
        fi
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
    fi
}

echo "🏥 Health Checks"
echo "----------------"

# Test base connectivity
run_test "Basic connectivity" "curl -f $URL" ""

# Test health endpoint
run_test "Health endpoint" "curl -f $URL/api/health" ""

# Test API response time
echo -n "Testing API response time... "
response_time=$(curl -o /dev/null -s -w "%{time_total}" "$URL/api/health")
if (( $(echo "$response_time < 2.0" | bc -l) )); then
    echo -e "${GREEN}✅ PASSED (${response_time}s)${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  SLOW (${response_time}s)${NC}"
    ((FAILED++))
fi

echo ""
echo "🔧 Functionality Tests"
echo "----------------------"

# Test admin endpoints
run_test "Admin health check" "curl -f $URL/api/admin/content/health" ""

# Test database connection
echo -n "Testing database connection... "
db_status=$(curl -s "$URL/api/health" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
if [ "$db_status" = "healthy" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAILED (Status: $db_status)${NC}"
    ((FAILED++))
fi

# Test AI service
echo -n "Testing AI service... "
ai_status=$(curl -s "$URL/api/health" | grep -o '"ai_service":"[^"]*"' | cut -d'"' -f4)
if [ "$ai_status" = "healthy" ]; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING (Status: $ai_status)${NC}"
fi

echo ""
echo "🔒 Security Tests"
echo "-----------------"

# Test HTTPS redirect (se non localhost)
if [[ $URL != *"localhost"* ]]; then
    echo -n "Testing HTTPS redirect... "
    http_url=$(echo $URL | sed 's/https/http/')
    redirect_location=$(curl -s -I "$http_url" | grep -i "location:" | cut -d' ' -f2)
    if [[ $redirect_location == https* ]]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
    fi
fi

# Test security headers
echo -n "Testing security headers... "
headers=$(curl -s -I "$URL")
security_score=0

if echo "$headers" | grep -qi "x-frame-options"; then ((security_score++)); fi
if echo "$headers" | grep -qi "x-content-type-options"; then ((security_score++)); fi
if echo "$headers" | grep -qi "strict-transport-security"; then ((security_score++)); fi

if [ $security_score -ge 2 ]; then
    echo -e "${GREEN}✅ PASSED ($security_score/3)${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  PARTIAL ($security_score/3)${NC}"
fi

echo ""
echo "📊 Performance Tests"
echo "--------------------"

# Test concurrent requests
echo -n "Testing concurrent requests... "
concurrent_test() {
    for i in {1..5}; do
        curl -s "$URL/api/health" &
    done
    wait
}

start_time=$(date +%s.%N)
concurrent_test
end_time=$(date +%s.%N)
duration=$(echo "$end_time - $start_time" | bc)

if (( $(echo "$duration < 3.0" | bc -l) )); then
    echo -e "${GREEN}✅ PASSED (${duration}s)${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  SLOW (${duration}s)${NC}"
fi

echo ""
echo "📋 Summary"
echo "=========="
echo -e "Total tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Deployment is healthy.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please check the deployment.${NC}"
    exit 1
fi