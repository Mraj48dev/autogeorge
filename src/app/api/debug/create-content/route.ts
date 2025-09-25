import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * TEMPORARY DEBUG ENDPOINT
 * Test direct content creation to isolate the issue
 */
export async function POST(request: NextRequest) {
  try {
    const testSourceId = 'cmfzyrmw5jbbfpd8c';

    console.log('🧪 Testing direct content creation...');

    const testContent = await prisma.content.create({
      data: {
        sourceId: testSourceId,
        guid: `test-${Date.now()}-${Math.random()}`,
        title: 'TEST ARTICLE - Debug Content Creation',
        content: 'This is a test article created via direct API call',
        url: `https://test.com/article-${Date.now()}`,
        publishedAt: new Date(),
        fetchedAt: new Date(),
        processed: false,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Content created successfully!',
      content: {
        id: testContent.id,
        title: testContent.title,
        guid: testContent.guid
      }
    });

  } catch (error) {
    console.error('❌ Direct content creation failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}