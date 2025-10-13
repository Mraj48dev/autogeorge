#!/bin/bash

# AutoGeorge Development Monitor
# Monitor real-time durante lo sviluppo locale

# Configurazione
MONITOR_INTERVAL=30
BASE_URL="https://autogeorge.vercel.app"
LOG_FILE="/tmp/autogeorge-dev-monitor.log"

# Colori
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Trap per cleanup
cleanup() {
    echo ""
    echo -e "${BLUE}🛑 Dev Monitor stopped${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

clear
echo -e "${CYAN}🔍 AutoGeorge Development Monitor${NC}"
echo -e "${CYAN}=================================${NC}"
echo -e "Monitoring every ${MONITOR_INTERVAL}s - Press Ctrl+C to stop"
echo -e "Log file: ${BLUE}$LOG_FILE${NC}"
echo ""

# Contatori
ITERATION=0
CONSECUTIVE_FAILURES=0

while true; do
    ITERATION=$((ITERATION + 1))
    TIMESTAMP=$(date "+%H:%M:%S")

    echo -e "${BLUE}[$TIMESTAMP] Check #$ITERATION${NC}"
    echo "────────────────────────────────"

    # Test 1: Basic Health
    echo -n "💓 Health check: "
    if response=$(timeout 5 curl -s "$BASE_URL/api/health" 2>/dev/null); then
        if echo "$response" | grep -q '"status":"healthy"'; then
            echo -e "${GREEN}✅ HEALTHY${NC}"
            health_status="healthy"
        else
            echo -e "${YELLOW}⚠️ DEGRADED${NC}"
            health_status="degraded"
        fi
        CONSECUTIVE_FAILURES=0
    else
        echo -e "${RED}❌ FAILED${NC}"
        health_status="failed"
        CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
    fi

    # Test 2: Comprehensive Check
    echo -n "🔍 Comprehensive: "
    if comp_response=$(timeout 10 curl -s "$BASE_URL/api/health/comprehensive" 2>/dev/null); then
        overall=$(echo "$comp_response" | grep -o '"overall":"[^"]*"' | cut -d'"' -f4)
        service_count=$(echo "$comp_response" | grep -o '"checks":\[' | wc -l)

        if [ "$overall" = "healthy" ]; then
            echo -e "${GREEN}✅ $overall ($service_count services)${NC}"
        elif [ "$overall" = "degraded" ]; then
            echo -e "${YELLOW}⚠️ $overall ($service_count services)${NC}"
        else
            echo -e "${RED}❌ $overall ($service_count services)${NC}"
        fi
    else
        echo -e "${RED}❌ TIMEOUT${NC}"
    fi

    # Test 3: Database Quick Check
    echo -n "🗄️ Database: "
    if echo "$comp_response" | grep -q '"database","status":"healthy"'; then
        echo -e "${GREEN}✅ CONNECTED${NC}"
    else
        echo -e "${RED}❌ ISSUES${NC}"
    fi

    # Test 4: RSS Sources
    echo -n "📰 RSS Sources: "
    if rss_info=$(echo "$comp_response" | grep -o '"rss-sources"[^}]*}'); then
        if echo "$rss_info" | grep -q '"status":"healthy"'; then
            total=$(echo "$rss_info" | grep -o '"total":[0-9]*' | cut -d':' -f2)
            healthy=$(echo "$rss_info" | grep -o '"healthy":[0-9]*' | cut -d':' -f2)
            echo -e "${GREEN}✅ $healthy/$total active${NC}"
        else
            echo -e "${YELLOW}⚠️ ISSUES${NC}"
        fi
    else
        echo -e "${RED}❌ NO DATA${NC}"
    fi

    # Alert per failures consecutive
    if [ $CONSECUTIVE_FAILURES -gt 3 ]; then
        echo ""
        echo -e "${RED}🚨 ALERT: $CONSECUTIVE_FAILURES consecutive failures!${NC}"
        echo -e "${RED}   System may be down or unreachable${NC}"

        # Beep se disponibile (macOS/Linux)
        (tput bel 2>/dev/null || echo -e "\007") &
    fi

    # Sistema status summary
    echo ""
    case $health_status in
        "healthy")
            echo -e "Status: ${GREEN}🟢 ALL SYSTEMS GO${NC}"
            ;;
        "degraded")
            echo -e "Status: ${YELLOW}🟡 SOME ISSUES${NC}"
            ;;
        "failed")
            echo -e "Status: ${RED}🔴 SYSTEM DOWN${NC}"
            ;;
    esac

    # Log entry
    echo "[$TIMESTAMP] Health: $health_status, Comprehensive: $overall" >> "$LOG_FILE"

    echo ""
    echo -e "${BLUE}Next check in ${MONITOR_INTERVAL}s...${NC}"
    echo ""

    sleep $MONITOR_INTERVAL

    # Clear screen per next iteration (ma mantiene storico)
    if [ $ITERATION -gt 1 ]; then
        # Sposta cursor su senza clear completo
        printf "\033[2J\033[H"

        echo -e "${CYAN}🔍 AutoGeorge Development Monitor${NC}"
        echo -e "${CYAN}=================================${NC}"
        echo -e "Monitoring every ${MONITOR_INTERVAL}s - Press Ctrl+C to stop"
        echo -e "Log file: ${BLUE}$LOG_FILE${NC}"
        echo ""
    fi
done