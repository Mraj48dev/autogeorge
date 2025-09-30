import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * FORCE DATABASE MIGRATION
 * Temporary endpoint to apply schema changes to production database
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting forced database migration...');

    // First, check current schema
    const existingColumns = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'feed_items'
      AND table_schema = 'public'
    `;

    console.log('📊 Current feed_items columns:', existingColumns);

    // Check if status column exists
    const hasStatusColumn = (existingColumns as any[]).some(
      col => col.column_name === 'status'
    );

    if (hasStatusColumn) {
      return NextResponse.json({
        success: true,
        message: 'Status column already exists',
        columns: existingColumns
      });
    }

    console.log('🔧 Adding status column and migrating data...');

    // Step 1: Add status column with default value
    await prisma.$executeRaw`
      ALTER TABLE feed_items
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
    `;

    console.log('✅ Status column added');

    // Step 2: Migrate existing data
    // processed = true -> status = 'processed'
    // processed = false -> status = 'pending' (safe default)
    await prisma.$executeRaw`
      UPDATE feed_items
      SET status = CASE
        WHEN processed = true THEN 'processed'
        ELSE 'pending'
      END
    `;

    console.log('✅ Data migrated from processed to status');

    // Step 3: Create index on status column
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_feed_items_status
      ON feed_items(status)
    `;

    console.log('✅ Index created on status column');

    // Step 4: Drop old processed column (optional - keep for safety)
    // await prisma.$executeRaw`ALTER TABLE feed_items DROP COLUMN IF EXISTS processed`;

    // Verify migration
    const newColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'feed_items'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    console.log('✅ Migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully',
      oldColumns: existingColumns,
      newColumns: newColumns,
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

export async function GET(request: NextRequest) {
  try {
    // Check current schema without making changes
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'feed_items'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    const hasStatusColumn = (columns as any[]).some(
      col => col.column_name === 'status'
    );

    const hasProcessedColumn = (columns as any[]).some(
      col => col.column_name === 'processed'
    );

    return NextResponse.json({
      success: true,
      currentSchema: columns,
      hasStatusColumn,
      hasProcessedColumn,
      migrationNeeded: !hasStatusColumn,
      message: hasStatusColumn
        ? 'Migration already applied'
        : 'Migration needed - status column missing'
    });

  } catch (error) {
    console.error('❌ Schema check failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}