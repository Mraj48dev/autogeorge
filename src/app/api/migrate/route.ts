import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * DATABASE MIGRATION ENDPOINT
 * Applies the status column migration to production database
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting database migration...');

    // Check if status column already exists
    const columns = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'feed_items'
      AND table_schema = 'public'
      AND column_name = 'status'
    `;

    if ((columns as any[]).length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Migration already applied - status column exists',
        action: 'none'
      });
    }

    console.log('🔧 Adding status column...');

    // Add status column
    await prisma.$executeRaw`
      ALTER TABLE feed_items
      ADD COLUMN status VARCHAR(20) DEFAULT 'pending'
    `;

    console.log('📊 Migrating existing data...');

    // Migrate existing data
    await prisma.$executeRaw`
      UPDATE feed_items
      SET status = CASE
        WHEN processed = true THEN 'processed'
        ELSE 'pending'
      END
    `;

    console.log('📈 Creating index...');

    // Create index
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_feed_items_status
      ON feed_items(status)
    `;

    console.log('✅ Migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully',
      changes: [
        'Added status column (VARCHAR(20) DEFAULT \'pending\')',
        'Migrated processed=true to status=\'processed\'',
        'Migrated processed=false to status=\'pending\'',
        'Created index on status column'
      ]
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database migration failed'
    }, { status: 500 });
  }
}