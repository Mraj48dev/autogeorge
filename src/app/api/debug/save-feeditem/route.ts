import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting direct FeedItem save test...');

    // Test diretto salvataggio FeedItem
    const testFeedItem = await prisma.feedItem.create({
      data: {
        sourceId: 'cmfzyrmw5jbbfpd8c',
        guid: `TEST-DIRECT-${Date.now()}`,
        title: 'Test Direct Save',
        content: 'This is a direct test save to verify database connectivity',
        url: 'https://test.direct.save',
        publishedAt: new Date(),
        fetchedAt: new Date(),
        processed: false,
      }
    });

    console.log('✅ Direct FeedItem save successful:', testFeedItem.id);

    // Conta tutti i FeedItems per questa source
    const totalItems = await prisma.feedItem.count({
      where: { sourceId: 'cmfzyrmw5jbbfpd8c' }
    });

    return NextResponse.json({
      success: true,
      savedItem: testFeedItem,
      totalItemsForSource: totalItems,
      message: 'Direct FeedItem save test successful'
    });

  } catch (error) {
    console.error('❌ Direct FeedItem save failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}