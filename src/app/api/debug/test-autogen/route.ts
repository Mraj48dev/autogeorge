import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

export async function POST(request: NextRequest) {
  try {
    const { sourceId } = await request.json();

    // 1. Elimina tutti i FeedItems della source per simulare contenuti "nuovi"
    const deleteResult = await prisma.feedItem.deleteMany({
      where: { sourceId }
    });

    console.log(`🗑️ Deleted ${deleteResult.count} existing FeedItems for source ${sourceId}`);

    // 2. Trigger fetch immediato
    const fetchResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/sources/${sourceId}/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true })
    });

    const fetchResult = await fetchResponse.json();

    return NextResponse.json({
      success: true,
      deletedItems: deleteResult.count,
      fetchResult
    });

  } catch (error) {
    console.error('Debug test error:', error);
    return NextResponse.json({ error: 'Debug test failed' }, { status: 500 });
  }
}