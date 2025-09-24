#!/bin/bash

# AutoGeorge Database Restore Script
# Usage: ./scripts/restore-database.sh [backup_file.sql.gz]

set -e

if [ $# -eq 0 ]; then
    echo "❌ Error: Please provide backup file path"
    echo "Usage: $0 [backup_file.sql.gz]"
    echo ""
    echo "Available backups:"
    ls -la backups/database/*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"
DATABASE_URL="postgresql://neondb_owner:npg_Vmi0eUX4dLSr@ep-solitary-sound-abznx4t0-pooler.eu-west-2.aws.neon.tech/autogeorge?sslmode=require"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file '$BACKUP_FILE' not found"
    exit 1
fi

echo "⚠️  WARNING: This will COMPLETELY REPLACE the current database!"
echo "📁 Backup file: $BACKUP_FILE"
echo "🎯 Target database: autogeorge (Neon.tech)"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Restore cancelled"
    exit 0
fi

echo "🔄 Starting database restore..."

# Restore from compressed backup
echo "📦 Decompressing and restoring backup..."
zcat "$BACKUP_FILE" | psql "$DATABASE_URL"

echo "✅ Database restore completed successfully!"
echo "🎉 Database has been restored from: $BACKUP_FILE"