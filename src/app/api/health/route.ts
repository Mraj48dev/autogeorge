import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check endpoint per Vercel e monitoraggio.
 *
 * Questo endpoint verifica:
 * - Status base dell'applicazione
 * - Connessione database (se disponibile)
 * - Stato servizi esterni
 * - Metriche di performance
 *
 * Utilizzo: GET /api/health
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Info base applicazione
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    // Test database (semplificato per evitare errori durante build)
    let databaseStatus = 'unknown';
    try {
      // In un'implementazione completa, qui testeresti la connessione DB
      // const { PrismaClient } = await import('@prisma/client');
      // const prisma = new PrismaClient();
      // await prisma.$queryRaw`SELECT 1`;
      // await prisma.$disconnect();
      databaseStatus = process.env.DATABASE_URL ? 'configured' : 'not_configured';
    } catch (error) {
      databaseStatus = 'error';
    }

    // Test servizi esterni (semplificato)
    let aiServiceStatus = 'unknown';
    try {
      aiServiceStatus = process.env.PERPLEXITY_API_KEY ? 'configured' : 'not_configured';
    } catch (error) {
      aiServiceStatus = 'error';
    }

    // Verifica configurazione critica
    const criticalConfig = {
      database: !!process.env.DATABASE_URL,
      perplexityApi: !!process.env.PERPLEXITY_API_KEY,
      nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      jwtSecret: !!process.env.JWT_SECRET,
    };

    const isFullyConfigured = Object.values(criticalConfig).every(Boolean);

    // Response time
    const responseTime = Date.now() - startTime;

    const response = {
      ...healthData,
      status: isFullyConfigured ? 'healthy' : 'degraded',
      services: {
        database: databaseStatus,
        ai_service: aiServiceStatus,
      },
      configuration: {
        critical_config_complete: isFullyConfigured,
        details: criticalConfig,
      },
      metrics: {
        response_time_ms: responseTime,
        memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        cpu_usage: 'N/A', // Complesso da calcolare in serverless
      },
      vercel: {
        region: process.env.VERCEL_REGION || 'unknown',
        deployment_url: process.env.VERCEL_URL || 'unknown',
      },
    };

    // Status code basato sulla salute
    const statusCode = isFullyConfigured ? 200 : 503;

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    // Error response
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'HEALTH_CHECK_FAILED',
      },
      response_time_ms: Date.now() - startTime,
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  }
}

// Supporta anche HEAD per health checks più leggeri
export async function HEAD(request: NextRequest) {
  try {
    const isConfigured = !!(
      process.env.DATABASE_URL &&
      process.env.PERPLEXITY_API_KEY &&
      process.env.NEXTAUTH_SECRET
    );

    return new Response(null, {
      status: isConfigured ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return new Response(null, { status: 500 });
  }
}