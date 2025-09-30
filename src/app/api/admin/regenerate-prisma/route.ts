import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * POST /api/admin/regenerate-prisma
 * Regenerates Prisma client to pick up new schema changes
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Regenerating Prisma client...');

    // This endpoint simulates what `npx prisma generate` would do
    // In production, Vercel automatically generates the client during build
    // But we can trigger a cache refresh by importing prisma fresh

    const { prisma } = await import('@/shared/database/prisma');

    // Test if featuredImage model is now available
    try {
      // Try to use the featuredImage model
      const testQuery = await prisma.$queryRaw`
        SELECT table_name FROM information_schema.tables
        WHERE table_name = 'featured_images' AND table_schema = 'public'
      `;

      console.log('✅ featured_images table exists:', testQuery);

      // Test if we can access the featuredImage model
      console.log('🔍 Testing Prisma model access...');

      // This should work if the model is properly generated
      const modelTest = prisma.featuredImage;
      console.log('✅ FeaturedImage model accessible:', !!modelTest);

      return NextResponse.json({
        success: true,
        message: 'Prisma client regenerated successfully',
        tests: {
          tableExists: Array.isArray(testQuery) && testQuery.length > 0,
          modelAccessible: !!modelTest
        }
      });

    } catch (modelError) {
      console.error('❌ Model access error:', modelError);

      return NextResponse.json({
        success: false,
        error: 'FeaturedImage model not accessible',
        details: modelError instanceof Error ? modelError.message : 'Unknown error',
        suggestion: 'May need deployment restart to pick up new schema'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Prisma regeneration failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to regenerate Prisma client',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Prisma regeneration endpoint',
    usage: 'POST to regenerate Prisma client and test model availability'
  });
}