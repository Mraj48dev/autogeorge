#!/bin/bash

# AutoGeorge Selective Rollback Script
# Usage: ./scripts/rollback-to-commit.sh [commit-hash]
# Rollback a commit specifico con safety checks

set -e

if [ $# -eq 0 ]; then
    echo "❌ Error: Please provide commit hash"
    echo "Usage: $0 [commit-hash]"
    echo ""
    echo "Recent commits:"
    git log --oneline -10
    exit 1
fi

COMMIT_HASH="$1"

# Validate commit exists
if ! git cat-file -e "$COMMIT_HASH" 2>/dev/null; then
    echo "❌ Error: Commit '$COMMIT_HASH' not found"
    exit 1
fi

echo "🔄 SELECTIVE ROLLBACK - AutoGeorge"
echo "=================================="
echo ""
echo "Target commit:"
git log --oneline -1 "$COMMIT_HASH"
echo ""
echo "Current commit:"
git log --oneline -1 HEAD
echo ""

# Check if it's safe (only last few commits)
COMMITS_BEHIND=$(git rev-list --count "$COMMIT_HASH"..HEAD)
if [ "$COMMITS_BEHIND" -gt 5 ]; then
    echo "⚠️  WARNING: Rolling back $COMMITS_BEHIND commits"
    echo "   This is a large rollback - consider using full-rollback.sh instead"
    echo ""
    read -p "Continue with large rollback? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "❌ Rollback cancelled"
        exit 0
    fi
fi

echo "⚠️  This will:"
echo "   1. Create backup of current state"
echo "   2. Rollback to commit: $COMMIT_HASH"
echo "   3. Push rollback to remote"
echo "   4. Trigger automatic Vercel redeploy"
echo ""

read -p "Continue with rollback? (yes/no): " -r

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Rollback cancelled"
    exit 0
fi

echo ""
echo "🔄 Starting selective rollback..."

# Create backup tag
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
git tag "rollback-backup-$TIMESTAMP" HEAD
echo "✅ Backup tag created: rollback-backup-$TIMESTAMP"

# Create database backup (safety)
echo "💾 Creating safety database backup..."
./scripts/backup-database.sh
echo "✅ Database backup completed"

# Revert commits between current and target
echo "⏪ Reverting commits..."
COMMITS_TO_REVERT=$(git rev-list --reverse "$COMMIT_HASH"..HEAD)

for commit in $COMMITS_TO_REVERT; do
    echo "  ⏪ Reverting: $(git log --oneline -1 $commit)"
    git revert --no-edit "$commit"
done

echo "🚀 Pushing rollback to remote..."
git push origin main

echo ""
echo "✅ SELECTIVE ROLLBACK COMPLETED!"
echo "================================"
echo "🔄 Rolled back to: $COMMIT_HASH"
echo "📝 Backup tag: rollback-backup-$TIMESTAMP"
echo "💾 Database backup: Latest in backups/database/"
echo "⏱️  Vercel redeploy: 30-60 seconds"
echo ""
echo "💡 To undo this rollback:"
echo "   git reset --hard rollback-backup-$TIMESTAMP"
echo "   git push --force-with-lease origin main"