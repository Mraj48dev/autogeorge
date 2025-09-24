#!/bin/bash

# AutoGeorge Database Backup Script
# Usage: ./scripts/backup-database.sh

set -e

# Database connection string
DATABASE_URL="postgresql://neondb_owner:npg_Vmi0eUX4dLSr@ep-solitary-sound-abznx4t0-pooler.eu-west-2.aws.neon.tech/autogeorge?sslmode=require"

# Create backup directory if it doesn't exist
BACKUP_DIR="backups/database"
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/autogeorge_backup_$TIMESTAMP.sql"

echo "🔄 Starting database backup..."
echo "📁 Backup file: $BACKUP_FILE"

# Create backup using pg_dump
pg_dump "$DATABASE_URL" \
  --verbose \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --format=plain \
  > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

echo "✅ Backup completed successfully!"
echo "📦 Compressed backup: $COMPRESSED_FILE"
echo "📊 File size: $(ls -lh "$COMPRESSED_FILE" | awk '{print $5}')"

# Keep only last 10 backups
echo "🧹 Cleaning old backups (keeping last 10)..."
ls -t "$BACKUP_DIR"/autogeorge_backup_*.sql.gz | tail -n +11 | xargs -r rm

echo "🎉 Backup process completed!"
echo "💡 To restore: zcat $COMPRESSED_FILE | psql \$DATABASE_URL"