import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * DEBUG ENDPOINT: Discover actual database structure
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Discovering actual database structure...');

    // Method 1: Try to get table info from information_schema
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `;

    console.log('📊 Table structure:', tableInfo);

    // Method 2: Try a simple select * with limit 1 to see what fields exist
    let sampleUser = null;
    try {
      const result = await prisma.$queryRaw`SELECT * FROM users LIMIT 1;`;
      sampleUser = result;
      console.log('👤 Sample user:', sampleUser);
    } catch (selectError) {
      console.log('❌ Could not select from users:', selectError);
    }

    // Method 3: Try basic fields only
    let basicQuery = null;
    try {
      basicQuery = await prisma.user.findFirst({
        select: {
          id: true,
          email: true
        }
      });
      console.log('✅ Basic query works:', basicQuery);
    } catch (basicError) {
      console.log('❌ Basic query failed:', basicError);
    }

    return NextResponse.json({
      success: true,
      debug: {
        tableStructure: tableInfo,
        sampleUser: sampleUser,
        basicQuery: basicQuery
      }
    });

  } catch (error) {
    console.error('💥 Database introspection error:', error);
    return NextResponse.json({
      error: 'Database introspection failed',
      details: error.message
    }, { status: 500 });
  }
}