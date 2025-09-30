import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * DATABASE MIGRATION ENDPOINT
 * Applies database schema migrations
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting database migration...');

    // Check if featured_images table already exists
    const featuredImageTable = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'featured_images'
      AND table_schema = 'public'
    `;

    console.log(`🔍 Featured images table check: ${(featuredImageTable as any[]).length} results`);

    if ((featuredImageTable as any[]).length === 0) {
      console.log('🎨 Creating featured_images table...');

      // Create featured_images table for Image Module
      await prisma.$executeRaw`
        CREATE TABLE featured_images (
          id TEXT PRIMARY KEY,
          article_id TEXT NOT NULL,
          ai_prompt TEXT NOT NULL,
          filename TEXT NOT NULL,
          alt_text TEXT NOT NULL,
          url TEXT,
          status TEXT NOT NULL,
          search_query TEXT,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Add foreign key constraint
      await prisma.$executeRaw`
        ALTER TABLE featured_images
        ADD CONSTRAINT fk_featured_images_article
        FOREIGN KEY (article_id) REFERENCES articles(id)
        ON DELETE CASCADE
      `;

      // Create indexes
      await prisma.$executeRaw`
        CREATE INDEX idx_featured_images_article_id ON featured_images(article_id)
      `;

      await prisma.$executeRaw`
        CREATE INDEX idx_featured_images_status ON featured_images(status)
      `;

      await prisma.$executeRaw`
        CREATE INDEX idx_featured_images_created_at ON featured_images(created_at)
      `;

      console.log('✅ featured_images table created successfully');
    }

    // Check if feed_items status column exists (legacy migration)
    const statusColumn = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'feed_items'
      AND table_schema = 'public'
      AND column_name = 'status'
    `;

    if ((statusColumn as any[]).length === 0) {
      console.log('🔧 Adding status column to feed_items...');

      await prisma.$executeRaw`
        ALTER TABLE feed_items
        ADD COLUMN status VARCHAR(20) DEFAULT 'pending'
      `;

      await prisma.$executeRaw`
        UPDATE feed_items
        SET status = CASE
          WHEN processed = true THEN 'processed'
          ELSE 'pending'
        END
      `;

      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_feed_items_status
        ON feed_items(status)
      `;

      console.log('✅ feed_items status migration completed');
    }

    console.log('✅ All migrations completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Database migrations completed successfully',
      changes: [
        'Created featured_images table for Image Module',
        'Added foreign key constraint to articles',
        'Created indexes for performance',
        'Legacy feed_items status column (if needed)'
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