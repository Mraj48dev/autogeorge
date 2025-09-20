#!/bin/bash

# Script di monitoraggio per AutoGeorge
# Utilizzo: ./scripts/monitor.sh [--interval=30] [--url=http://localhost:3000]

INTERVAL=30
URL="http://localhost:3000"
LOG_FILE="logs/monitor.log"

# Parse arguments
for arg in "$@"; do
    case $arg in
        --interval=*)
            INTERVAL="${arg#*=}"
            shift
            ;;
        --url=*)
            URL="${arg#*=}"
            shift
            ;;
        *)
            ;;
    esac
done

# Create logs directory
mkdir -p logs

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "$timestamp - $1" | tee -a "$LOG_FILE"
}

check_health() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Basic connectivity
    if curl -f "$URL/api/health" &>/dev/null; then
        local response=$(curl -s "$URL/api/health")
        local status=$(echo "$response" | jq -r '.status // "unknown"')

        if [ "$status" = "healthy" ]; then
            log "${GREEN}✅ System healthy${NC}"

            # Extract metrics
            local cpu_usage=$(echo "$response" | jq -r '.metrics.cpu_usage // "N/A"')
            local memory_usage=$(echo "$response" | jq -r '.metrics.memory_usage // "N/A"')
            local active_connections=$(echo "$response" | jq -r '.metrics.active_connections // "N/A"')

            log "${BLUE}📊 CPU: $cpu_usage, Memory: $memory_usage, Connections: $active_connections${NC}"

        else
            log "${YELLOW}⚠️  System status: $status${NC}"
        fi
    else
        log "${RED}❌ System unreachable${NC}"

        # Try to restart if using Docker
        if command -v docker-compose &> /dev/null; then
            log "${YELLOW}🔄 Attempting to restart services...${NC}"
            docker-compose restart
        fi
    fi
}

# Signal handler for graceful shutdown
cleanup() {
    log "${BLUE}📝 Monitoring stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

log "${BLUE}🚀 Starting AutoGeorge monitoring...${NC}"
log "${BLUE}📡 URL: $URL${NC}"
log "${BLUE}⏱️  Interval: ${INTERVAL}s${NC}"
log "${BLUE}📋 Log file: $LOG_FILE${NC}"

while true; do
    check_health
    sleep "$INTERVAL"
done