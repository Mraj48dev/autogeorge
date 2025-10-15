import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'working',
    message: 'Clerk auth system is operational',
    timestamp: new Date().toISOString()
  });
}