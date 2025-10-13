#!/bin/bash

# AutoGeorge Emergency Rollback Script
# Usage: ./scripts/emergency-rollback.sh
# Rollback immediato dell'ultimo commit - per situazioni di emergenza

set -e

echo "🚨 EMERGENCY ROLLBACK - AutoGeorge"
echo "=================================="
echo ""
echo "⚠️  This will:"
echo "   1. Revert the last commit"
echo "   2. Push the rollback to remote"
echo "   3. Trigger automatic Vercel redeploy"
echo ""

# Mostra ultimo commit
echo "📋 Last commit to be reverted:"
git log --oneline -1
echo ""

read -p "🚨 EMERGENCY: Continue with rollback? (yes/no): " -r

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Emergency rollback cancelled"
    exit 0
fi

echo ""
echo "🔄 Starting emergency rollback..."

# Crea backup prima del rollback
echo "💾 Creating emergency backup..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
git tag "emergency-backup-$TIMESTAMP" HEAD
echo "✅ Emergency backup tag created: emergency-backup-$TIMESTAMP"

# Revert ultimo commit
echo "⏪ Reverting last commit..."
git revert --no-edit HEAD

# Push immediato
echo "🚀 Pushing rollback to remote..."
git push origin main

echo ""
echo "✅ EMERGENCY ROLLBACK COMPLETED!"
echo "==================================="
echo "🔄 Vercel will automatically redeploy the previous version"
echo "⏱️  Expected rollback time: 30-60 seconds"
echo "🔍 Monitor: https://autogeorge.vercel.app/api/health"
echo ""
echo "📝 Emergency backup tag: emergency-backup-$TIMESTAMP"
echo "💡 To undo this rollback: git revert HEAD && git push"