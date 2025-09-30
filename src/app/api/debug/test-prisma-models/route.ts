import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * DEBUG endpoint to test Prisma model availability
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing Prisma models availability...');

    // Test all available models
    const availableModels = Object.keys(prisma).filter(key =>
      typeof (prisma as any)[key] === 'object' &&
      (prisma as any)[key].findMany
    );

    console.log('📋 Available Prisma models:', availableModels);

    // Test specifically for featured image models
    const imageModels = availableModels.filter(model =>
      model.toLowerCase().includes('image') ||
      model.toLowerCase().includes('featured')
    );

    console.log('🎨 Image-related models:', imageModels);

    // Try different case variations
    const testCases = [
      'featuredImage',
      'FeaturedImage',
      'featured_image',
      'featured_images'
    ];

    const modelTests = {};
    for (const testCase of testCases) {
      try {
        const model = (prisma as any)[testCase];
        (modelTests as any)[testCase] = {
          exists: !!model,
          hasFindMany: !!(model && model.findMany),
          hasCreate: !!(model && model.create)
        };
      } catch (e) {
        (modelTests as any)[testCase] = { error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }

    // Test database table existence
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_name LIKE '%image%' AND table_schema = 'public'
    `;

    return NextResponse.json({
      success: true,
      debug: {
        availableModels,
        imageModels,
        modelTests,
        tableCheck,
        prismaVersion: 'Unknown',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Prisma debug failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      availableKeys: Object.keys(prisma).slice(0, 10) // First 10 keys for debugging
    }, { status: 500 });
  }
}