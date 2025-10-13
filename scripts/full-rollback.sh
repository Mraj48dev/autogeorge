#!/bin/bash

# AutoGeorge Full System Rollback Script
# Usage: ./scripts/full-rollback.sh [git-commit-hash] [backup-file.sql.gz]
# Rollback completo: codice + database

set -e

if [ $# -lt 2 ]; then
    echo "❌ Error: Please provide git commit and backup file"
    echo "Usage: $0 [git-commit-hash] [backup-file.sql.gz]"
    echo ""
    echo "Recent commits:"
    git log --oneline -5
    echo ""
    echo "Available database backups:"
    ls -la backups/database/*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

GIT_COMMIT="$1"
BACKUP_FILE="$2"
DATABASE_URL="postgresql://neondb_owner:npg_Vmi0eUX4dLSr@ep-solitary-sound-abznx4t0-pooler.eu-west-2.aws.neon.tech/autogeorge?sslmode=require"

# Validazioni
if ! git cat-file -e "$GIT_COMMIT" 2>/dev/null; then
    echo "❌ Error: Git commit '$GIT_COMMIT' not found"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file '$BACKUP_FILE' not found"
    exit 1
fi

echo "🚨 FULL SYSTEM ROLLBACK - AutoGeorge"
echo "===================================="
echo ""
echo "⚠️  DANGER: This will COMPLETELY rollback:"
echo "   📝 Code to commit: $GIT_COMMIT"
echo "   💾 Database to backup: $BACKUP_FILE"
echo ""
echo "Current state:"
echo "   📝 Current commit: $(git log --oneline -1)"
echo "   💾 Current database: autogeorge (Neon.tech)"
echo ""

read -p "🚨 FULL ROLLBACK: Are you absolutely sure? (yes/no): " -r

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Full rollback cancelled"
    exit 0
fi

echo ""
echo "🔄 Starting FULL SYSTEM ROLLBACK..."

# Step 1: Create emergency backup of current state
echo "💾 Step 1/4: Creating emergency backup of current state..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
git tag "full-rollback-backup-$TIMESTAMP" HEAD
echo "✅ Git backup tag: full-rollback-backup-$TIMESTAMP"

echo "💾 Creating current database backup..."
EMERGENCY_DB_BACKUP="backups/database/emergency_pre_rollback_$TIMESTAMP.sql"
mkdir -p backups/database
pg_dump "$DATABASE_URL" --verbose --clean --if-exists --no-owner --no-privileges --format=plain > "$EMERGENCY_DB_BACKUP"
gzip "$EMERGENCY_DB_BACKUP"
echo "✅ Database backup: ${EMERGENCY_DB_BACKUP}.gz"

# Step 2: Rollback database
echo ""
echo "💾 Step 2/4: Rolling back database..."
echo "📦 Restoring from: $BACKUP_FILE"
zcat "$BACKUP_FILE" | psql "$DATABASE_URL"
echo "✅ Database rollback completed"

# Step 3: Rollback code
echo ""
echo "📝 Step 3/4: Rolling back code..."
git reset --hard "$GIT_COMMIT"
echo "✅ Code rollback completed"

# Step 4: Force push (dangerous but necessary for full rollback)
echo ""
echo "🚀 Step 4/4: Force pushing rollback..."
echo "⚠️  This will overwrite remote history!"
read -p "Continue with force push? (yes/no): " -r

if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    git push --force-with-lease origin main
    echo "✅ Force push completed"
else
    echo "⚠️  Skipped force push - manual push required"
fi

echo ""
echo "🎉 FULL SYSTEM ROLLBACK COMPLETED!"
echo "=================================="
echo "📝 Code rolled back to: $GIT_COMMIT"
echo "💾 Database restored from: $BACKUP_FILE"
echo "🔄 Vercel will redeploy automatically"
echo ""
echo "🚨 EMERGENCY RECOVERY INFO:"
echo "   📝 Pre-rollback code: full-rollback-backup-$TIMESTAMP"
echo "   💾 Pre-rollback DB: ${EMERGENCY_DB_BACKUP}.gz"
echo ""
echo "💡 To recover from this rollback:"
echo "   git reset --hard full-rollback-backup-$TIMESTAMP"
echo "   ./scripts/restore-database.sh ${EMERGENCY_DB_BACKUP}.gz"