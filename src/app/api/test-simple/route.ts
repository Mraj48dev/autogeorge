import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
}

export async function POST() {
  return NextResponse.json({
    message: 'POST test endpoint working',
    timestamp: new Date().toISOString()
  });
}