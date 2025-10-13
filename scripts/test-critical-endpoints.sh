#!/bin/bash

# AutoGeorge Critical Endpoints Test Suite
# Test automatico degli endpoint più importanti del sistema

set -e

# Configurazione
BASE_URL="https://autogeorge.vercel.app"
TIMEOUT=10
RESULTS_FILE="/tmp/autogeorge-endpoint-tests.json"

# Colori
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Contatori
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "🧪 AutoGeorge Critical Endpoints Test Suite"
echo "==========================================="
echo ""

# Array per salvare risultati
declare -a TEST_RESULTS

# Funzione per test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    local expected_content="$4"
    local method="${5:-GET}"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing $name... "

    # Esegui il test
    local start_time=$(date +%s%3N)
    local response
    local http_code
    local response_time

    if response=$(timeout $TIMEOUT curl -s -w "%{http_code}" -X "$method" "$BASE_URL$url" 2>/dev/null); then
        http_code="${response: -3}"
        response_body="${response%???}"
        local end_time=$(date +%s%3N)
        response_time=$((end_time - start_time))

        # Verifica status code
        local status_ok=false
        if [ "$expected_status" = "any_success" ]; then
            if [[ $http_code -ge 200 && $http_code -lt 400 ]]; then
                status_ok=true
            fi
        elif [ "$http_code" = "$expected_status" ]; then
            status_ok=true
        fi

        # Verifica contenuto se specificato
        local content_ok=true
        if [ ! -z "$expected_content" ] && ! echo "$response_body" | grep -q "$expected_content"; then
            content_ok=false
        fi

        # Risultato del test
        if $status_ok && $content_ok; then
            echo -e "${GREEN}✅ PASS${NC} (${response_time}ms, HTTP $http_code)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            TEST_RESULTS+=("$name:PASS:$response_time:$http_code")
        else
            echo -e "${RED}❌ FAIL${NC} (${response_time}ms, HTTP $http_code)"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            TEST_RESULTS+=("$name:FAIL:$response_time:$http_code")

            if ! $status_ok; then
                echo -e "   ${RED}Expected HTTP $expected_status, got $http_code${NC}"
            fi
            if ! $content_ok; then
                echo -e "   ${RED}Expected content '$expected_content' not found${NC}"
            fi
        fi
    else
        echo -e "${RED}❌ TIMEOUT${NC} (>${TIMEOUT}s)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("$name:TIMEOUT:$TIMEOUT:000")
    fi
}

# Esegui i test
echo "🌐 Testing critical endpoints..."
echo ""

# Test 1: Basic Health Check
test_endpoint "Basic Health" "/api/health" "200" '"status":"healthy"'

# Test 2: Comprehensive Health Check
test_endpoint "Comprehensive Health" "/api/health/comprehensive" "any_success" '"overall":'

# Test 3: CRON Monitoring
test_endpoint "CRON Monitoring" "/api/cron/monitoring" "any_success" '"timestamp":'

# Test 4: Basic Database Query (through health)
test_endpoint "Database Connectivity" "/api/health" "200" '"database":'

# Test 5: Admin Dashboard API (may require auth - test availability)
test_endpoint "Dashboard API" "/api/admin/monitoring/dashboard" "any_success" ""

echo ""

# Test aggiuntivi specifici per AutoGeorge
echo "📊 Testing AutoGeorge specific functionality..."
echo ""

# Test RSS Sources (via comprehensive health)
echo -n "Testing RSS Sources functionality... "
if response=$(timeout $TIMEOUT curl -s "$BASE_URL/api/health/comprehensive" 2>/dev/null); then
    if echo "$response" | grep -q '"rss-sources"'; then
        echo -e "${GREEN}✅ PASS${NC} (RSS sources monitored)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${YELLOW}⚠️ WARN${NC} (RSS sources not found in health check)"
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
else
    echo -e "${RED}❌ FAIL${NC} (Could not check RSS sources)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Test Database Models Access
echo -n "Testing Database Models... "
if response=$(timeout $TIMEOUT curl -s "$BASE_URL/api/health/comprehensive" 2>/dev/null); then
    if echo "$response" | grep -q '"sources":\s*{' && echo "$response" | grep -q '"articles":'; then
        echo -e "${GREEN}✅ PASS${NC} (Core models accessible)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC} (Core models not accessible)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
else
    echo -e "${RED}❌ FAIL${NC} (Could not test database models)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Genera report JSON
cat > "$RESULTS_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS,
    "success_rate": $(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l 2>/dev/null || echo "0")
  },
  "tests": [
EOF

for i in "${!TEST_RESULTS[@]}"; do
    IFS=':' read -r name status response_time http_code <<< "${TEST_RESULTS[$i]}"
    echo "    {" >> "$RESULTS_FILE"
    echo "      \"name\": \"$name\"," >> "$RESULTS_FILE"
    echo "      \"status\": \"$status\"," >> "$RESULTS_FILE"
    echo "      \"response_time_ms\": $response_time," >> "$RESULTS_FILE"
    echo "      \"http_code\": $http_code" >> "$RESULTS_FILE"
    if [ $i -eq $((${#TEST_RESULTS[@]} - 1)) ]; then
        echo "    }" >> "$RESULTS_FILE"
    else
        echo "    }," >> "$RESULTS_FILE"
    fi
done

cat >> "$RESULTS_FILE" << EOF
  ]
}
EOF

# Summary finale
echo ""
echo "📋 TEST SUMMARY"
echo "==============="
echo -e "Total tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l 2>/dev/null || echo "0")
    echo -e "Success rate: $SUCCESS_RATE%"
fi

echo ""
echo -e "📄 Detailed results saved to: ${BLUE}$RESULTS_FILE${NC}"

# Exit con codice appropriato
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}⚠️ $FAILED_TESTS TESTS FAILED${NC}"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  1. Check Vercel deployment status"
    echo "  2. Verify database connection"
    echo "  3. Check application logs"
    echo "  4. Retry tests: ./scripts/test-critical-endpoints.sh"
    exit 1
fi