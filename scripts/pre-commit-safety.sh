#!/bin/bash

# AutoGeorge Pre-Commit Safety Check
# Esegue verifiche complete prima di ogni commit per evitare di rompere il sistema

set -e

echo "🛡️  AutoGeorge Pre-Commit Safety Check"
echo "====================================="
echo ""

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contatori
CHECKS_PASSED=0
CHECKS_FAILED=0
TOTAL_CHECKS=0

# Funzione per logging risultati
log_check() {
    local status=$1
    local message=$2
    local details=$3

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $message"
        [ ! -z "$details" ] && echo -e "   ${BLUE}ℹ️  $details${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC}: $message"
        [ ! -z "$details" ] && echo -e "   ${RED}⚠️  $details${NC}"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: $message"
        [ ! -z "$details" ] && echo -e "   ${YELLOW}⚠️  $details${NC}"
    fi
    echo ""
}

# 1. TypeScript Compilation Check
echo "🔧 Checking TypeScript compilation..."
if npm run build:check > /tmp/ts-check.log 2>&1; then
    log_check "PASS" "TypeScript compilation" "No type errors found"
else
    error_count=$(grep -c "error" /tmp/ts-check.log 2>/dev/null || echo "0")
    log_check "FAIL" "TypeScript compilation" "$error_count type errors found - check /tmp/ts-check.log"
fi

# 2. ESLint Check
echo "🔍 Running ESLint..."
if npm run lint > /tmp/eslint-check.log 2>&1; then
    log_check "PASS" "ESLint validation" "No linting errors"
else
    error_count=$(grep -c "error" /tmp/eslint-check.log 2>/dev/null || echo "unknown")
    log_check "FAIL" "ESLint validation" "$error_count linting errors found"
fi

# 3. Database Connection Test
echo "🗄️  Testing database connection..."
if timeout 10 node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`.then(() => {
  console.log('Database OK');
  process.exit(0);
}).catch(e => {
  console.error('Database ERROR:', e.message);
  process.exit(1);
}).finally(() => prisma.\$disconnect());
" > /tmp/db-check.log 2>&1; then
    log_check "PASS" "Database connectivity" "PostgreSQL connection successful"
else
    error_msg=$(cat /tmp/db-check.log 2>/dev/null || echo "Connection timeout")
    log_check "FAIL" "Database connectivity" "Database unreachable: $error_msg"
fi

# 4. Critical API Endpoints Test
echo "🌐 Testing critical endpoints..."

# Test health endpoint
if timeout 10 curl -s https://autogeorge.vercel.app/api/health > /tmp/health-check.log 2>&1; then
    status=$(cat /tmp/health-check.log | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ "$status" = "healthy" ]; then
        log_check "PASS" "Health endpoint" "API responding normally"
    else
        log_check "WARN" "Health endpoint" "API responding but status: $status"
    fi
else
    log_check "FAIL" "Health endpoint" "API not responding"
fi

# Test comprehensive health endpoint
if timeout 15 curl -s https://autogeorge.vercel.app/api/health/comprehensive > /tmp/health-comp-check.log 2>&1; then
    overall=$(cat /tmp/health-comp-check.log | grep -o '"overall":"[^"]*"' | cut -d'"' -f4)
    if [ "$overall" = "healthy" ] || [ "$overall" = "degraded" ]; then
        log_check "PASS" "Comprehensive health" "System status: $overall"
    else
        log_check "FAIL" "Comprehensive health" "System status: $overall"
    fi
else
    log_check "FAIL" "Comprehensive health" "Health check endpoint not responding"
fi

# 5. Environment Variables Check
echo "🔐 Validating environment variables..."
required_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "JWT_SECRET")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -eq 0 ]; then
    log_check "PASS" "Environment variables" "All critical vars present"
else
    log_check "FAIL" "Environment variables" "Missing: ${missing_vars[*]}"
fi

# 6. Prisma Schema Validation
echo "📊 Validating Prisma schema..."
if npx prisma validate > /tmp/prisma-check.log 2>&1; then
    log_check "PASS" "Prisma schema" "Schema is valid"
else
    error_msg=$(cat /tmp/prisma-check.log | tail -1)
    log_check "FAIL" "Prisma schema" "Schema validation failed: $error_msg"
fi

# 7. Git Status Check (warn if too many files)
echo "📝 Checking Git status..."
staged_files=$(git diff --cached --name-only | wc -l)
if [ $staged_files -lt 20 ]; then
    log_check "PASS" "Git staging" "$staged_files files staged"
else
    log_check "WARN" "Git staging" "$staged_files files staged (large commit)"
fi

# 8. Package.json Dependencies Check
echo "📦 Checking package dependencies..."
if npm audit --audit-level=high > /tmp/audit-check.log 2>&1; then
    log_check "PASS" "Security audit" "No high-risk vulnerabilities"
else
    vuln_count=$(grep -c "high\|critical" /tmp/audit-check.log 2>/dev/null || echo "unknown")
    log_check "WARN" "Security audit" "$vuln_count high/critical vulnerabilities found"
fi

# Final Summary
echo ""
echo "📋 SAFETY CHECK SUMMARY"
echo "======================="
echo -e "Total checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
echo -e "${RED}Failed: $CHECKS_FAILED${NC}"
echo ""

# Decision logic
if [ $CHECKS_FAILED -gt 0 ]; then
    echo -e "${RED}🚨 COMMIT BLOCKED${NC}"
    echo -e "${RED}$CHECKS_FAILED critical checks failed.${NC}"
    echo ""
    echo "🔧 How to fix:"
    echo "  1. Fix the failing checks listed above"
    echo "  2. Run this script again: ./scripts/pre-commit-safety.sh"
    echo "  3. If all checks pass, retry your commit"
    echo ""
    echo "🚨 Emergency override (NOT RECOMMENDED):"
    echo "   git commit --no-verify"
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo -e "${GREEN}Safe to commit!${NC}"

    if [ $staged_files -gt 10 ]; then
        echo ""
        echo -e "${YELLOW}💡 Consider splitting large commits into smaller ones${NC}"
    fi

    echo ""
    exit 0
fi