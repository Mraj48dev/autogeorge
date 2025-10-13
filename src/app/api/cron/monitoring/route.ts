import { NextRequest, NextResponse } from 'next/server';

/**
 * CRON Monitoring Endpoint - AutoGeorge FIXED VERSION
 *
 * COMPLETAMENTE RISCRITTO per bypassare problemi di cache e auth.
 * Questo endpoint è chiamato da cron-job.org ogni 5 minuti.
 *
 * URL CRON: https://autogeorge.vercel.app/api/cron/monitoring
 * Frequenza: Ogni 5 minuti
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    console.log('🔍 CRON monitoring v3-FIXED - Starting direct health check...');

    // Import Prisma direttamente
    const { prisma } = await import('@/shared/database/prisma');

    // HEALTH CHECK DIRETTO - ZERO HTTP CALLS
    const healthResult = await performDirectHealthCheck(prisma, startTime);

    console.log(`✅ Direct health check OK: ${healthResult.overall} (${healthResult.checks.length} services)`);

    // Calcola metriche
    const monitoringDuration = Date.now() - startTime;
    const summary = {
      overallStatus: healthResult.overall,
      totalServices: healthResult.checks.length,
      healthyServices: healthResult.summary.healthy,
      degradedServices: healthResult.summary.degraded,
      unhealthyServices: healthResult.summary.unhealthy,
      averageResponseTime: Math.round(
        healthResult.checks.reduce((sum: number, check: any) => sum + check.responseTime, 0) / healthResult.checks.length
      ),
      monitoringDuration
    };

    // Status emoji
    const statusEmoji = healthResult.overall === 'healthy' ? '🟢' :
                       healthResult.overall === 'degraded' ? '🟡' : '🔴';

    // Log status
    console.log(`${statusEmoji} System: ${healthResult.overall.toUpperCase()}`);
    console.log(`📊 Services: ${summary.healthyServices}✅ ${summary.degradedServices}⚠️ ${summary.unhealthyServices}❌`);

    // Response per cron-job.org
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      monitoring: {
        status: healthResult.overall,
        duration: monitoringDuration,
        version: 'v3-fixed-direct'
      },
      system: summary,
      healthCheck: {
        overall: healthResult.overall,
        services: healthResult.checks.map((check: any) => ({
          service: check.service,
          status: check.status,
          responseTime: check.responseTime
        }))
      },
      summary: `${statusEmoji} ${healthResult.overall} | ${summary.healthyServices}/${summary.totalServices} services OK | ${summary.averageResponseTime}ms avg`
    };

    // Log critical issues
    if (healthResult.overall === 'unhealthy') {
      console.error('🚨🚨🚨 CRITICAL: SYSTEM UNHEALTHY 🚨🚨🚨');
      healthResult.checks.filter((c: any) => c.status === 'unhealthy').forEach((service: any) => {
        console.error(`❌ ${service.service}: ${service.error || 'Service unavailable'}`);
      });
    }

    return NextResponse.json(response);

  } catch (error) {
    const errorDuration = Date.now() - startTime;

    console.error('🚨 CRON monitoring FIXED version failed:', error);

    const errorResponse = {
      success: false,
      error: 'Direct monitoring execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      duration: errorDuration,
      summary: '🔴 MONITOR FAILED | Direct health check error'
    };

    console.error('🚨🚨🚨 DIRECT MONITORING FAILURE 🚨🚨🚨');
    console.error(`Error: ${errorResponse.details}`);

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// HEALTH CHECK COMPLETAMENTE DIRETTO
async function performDirectHealthCheck(prisma: any, startTime: number) {
  const checks: any[] = [];

  // 1. Database Check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as test`;

    const [sourceCount, articleCount] = await Promise.all([
      prisma.source.count(),
      prisma.article.count()
    ]);

    checks.push({
      service: 'database',
      status: 'healthy',
      responseTime: Date.now() - dbStart,
      details: { sources: sourceCount, articles: articleCount }
    });
  } catch (error) {
    checks.push({
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'DB connection failed'
    });
  }

  // 2. Core Data Check
  try {
    const coreStart = Date.now();

    const [sources, activeSources, feedItems] = await Promise.all([
      prisma.source.count(),
      prisma.source.count({ where: { isActive: true } }),
      prisma.feedItem.count()
    ]);

    checks.push({
      service: 'core-data',
      status: 'healthy',
      responseTime: Date.now() - coreStart,
      details: { sources, activeSources, feedItems }
    });
  } catch (error) {
    checks.push({
      service: 'core-data',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Core data access failed'
    });
  }

  // 3. RSS Sources Status
  try {
    const rssStart = Date.now();

    const activeSources = await prisma.source.findMany({
      where: { isActive: true },
      select: { id: true, lastFetchStatus: true, lastFetchAt: true }
    });

    const now = new Date();
    const recentThreshold = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours

    const recentSuccessful = activeSources.filter((s: any) =>
      s.lastFetchAt && s.lastFetchAt > recentThreshold && s.lastFetchStatus === 'success'
    );

    const status = activeSources.length === 0 ? 'healthy' :
                  recentSuccessful.length === activeSources.length ? 'healthy' :
                  recentSuccessful.length > 0 ? 'degraded' : 'unhealthy';

    checks.push({
      service: 'rss-sources',
      status,
      responseTime: Date.now() - rssStart,
      details: {
        total: activeSources.length,
        recentSuccessful: recentSuccessful.length
      }
    });
  } catch (error) {
    checks.push({
      service: 'rss-sources',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'RSS check failed'
    });
  }

  // 4. System Resources
  try {
    const sysStart = Date.now();

    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    checks.push({
      service: 'system-resources',
      status: memMB > 512 ? 'degraded' : 'healthy',
      responseTime: Date.now() - sysStart,
      details: { memoryMB: memMB, uptime: Math.round(process.uptime()) }
    });
  } catch (error) {
    checks.push({
      service: 'system-resources',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'System check failed'
    });
  }

  // Calcola summary
  const summary = {
    healthy: checks.filter(c => c.status === 'healthy').length,
    degraded: checks.filter(c => c.status === 'degraded').length,
    unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    total: checks.length
  };

  const overall = summary.unhealthy > 0 ? 'unhealthy' :
                 summary.degraded > 0 ? 'degraded' : 'healthy';

  return {
    overall,
    timestamp: new Date().toISOString(),
    version: 'v3-fixed-direct',
    checks,
    summary
  };
}