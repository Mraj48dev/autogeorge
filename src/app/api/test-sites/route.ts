import { NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

export async function GET() {
  try {
    console.log('Testing sites API...');

    // Test basic query
    const count = await prisma.wordPressSite.count();
    console.log('Sites count:', count);

    // Test findMany with temp user
    const sites = await prisma.wordPressSite.findMany({
      where: { userId: 'temp-user-id' },
      select: { id: true, name: true, userId: true }
    });
    console.log('Sites for temp-user-id:', sites);

    return NextResponse.json({
      success: true,
      debug: {
        totalSites: count,
        tempUserSites: sites,
        message: 'Direct Prisma query successful'
      }
    });
  } catch (error) {
    console.error('Test sites error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}