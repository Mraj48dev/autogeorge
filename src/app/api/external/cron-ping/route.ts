import { NextRequest, NextResponse } from 'next/server';

/**
 * GET/POST /api/external/cron-ping
 * Endpoint pubblico per servizi esterni di cron (cron-job.org, UptimeRobot, etc.)
 * Questo endpoint triggera il polling RSS quando chiamato da servizi esterni
 */
export async function GET(request: NextRequest) {
  return handleCronPing(request);
}

export async function POST(request: NextRequest) {
  return handleCronPing(request);
}

async function handleCronPing(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || 'direct';

    console.log(`🔔 External cron ping received from: ${userAgent}`);

    // Trigger RSS polling
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://autogeorge.vercel.app';

      const pollResponse = await fetch(`${baseUrl}/api/cron/poll-feeds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AutoGeorge-External-Cron/1.0',
        },
        body: JSON.stringify({
          source: 'external-cron',
          immediate: true,
          userAgent,
          referer
        })
      });

      const pollData = await pollResponse.json();

      return NextResponse.json({
        success: true,
        message: 'RSS polling triggered successfully',
        timestamp: new Date().toISOString(),
        pollResult: pollData,
        source: 'external-cron',
        status: 'healthy'
      });

    } catch (pollError) {
      console.error('❌ Failed to trigger RSS polling:', pollError);

      return NextResponse.json({
        success: false,
        message: 'RSS polling failed',
        error: pollError instanceof Error ? pollError.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        source: 'external-cron',
        status: 'degraded'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ External cron ping error:', error);

    return NextResponse.json({
      success: false,
      message: 'Cron ping handler error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      status: 'error'
    }, { status: 500 });
  }
}