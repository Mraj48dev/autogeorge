import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify routing works
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Sources multi-tenant endpoint is working!',
    timestamp: new Date().toISOString(),
    endpoint: '/api/user/sources/test'
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  return NextResponse.json({
    success: true,
    message: 'POST endpoint is working!',
    receivedData: body,
    timestamp: new Date().toISOString(),
    endpoint: '/api/user/sources/test'
  });
}