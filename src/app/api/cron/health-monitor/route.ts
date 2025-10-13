import { NextRequest, NextResponse } from 'next/server';

/**
 * CRON Health Monitor Endpoint - AutoGeorge v3
 *
 * NUOVO endpoint per monitoring CRON che bypassa problemi di cache del vecchio.
 * Questo endpoint è progettato per essere chiamato da cron-job.org ogni 5 minuti.
 *
 * URL CRON: https://autogeorge.vercel.app/api/cron/health-monitor
 * Frequenza: Ogni 5 minuti
 *
 * Flusso:
 * 1. Esegue comprehensive health check interno (no HTTP calls)
 * 2. Processa alert basati sui risultati
 * 3. Salva metriche e genera summary
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    console.log('🔍 Starting CRON Health Monitor v3...');

    // Importa dinamicamente per evitare problemi di circular deps
    const { prisma } = await import('@/shared/database/prisma');

    // 1. Esegui health check DIRETTAMENTE (no HTTP calls)
    const healthData = await performDirectHealthCheck(prisma);

    console.log(`✅ Direct health check completed: ${healthData.overall} (${healthData.checks.length} services)`);

    // 2. Processa alert (se endpoint esiste)
    let alertData = { alertsTriggered: 0, alertsResolved: 0 };
    try {
      const baseUrl = process.env.VERCEL_URL ?
        `https://${process.env.VERCEL_URL}` :
        'https://autogeorge.vercel.app';

      const alertResponse = await fetch(`${baseUrl}/api/health/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AutoGeorge-CRON-Health-Monitor-v3'
        },
        body: JSON.stringify(healthData),
        signal: AbortSignal.timeout(15000)
      });

      if (alertResponse.ok) {
        alertData = await alertResponse.json();
        console.log(`🚨 Alerts processed: ${alertData.alertsTriggered} triggered, ${alertData.alertsResolved} resolved`);
      } else {
        console.warn('⚠️ Alert processing failed, continuing...');
      }
    } catch (alertError) {
      console.warn('⚠️ Alert processing error:', alertError instanceof Error ? alertError.message : 'Unknown');
    }

    // 3. Calculate monitoring metrics
    const monitoringDuration = Date.now() - startTime;
    const systemMetrics = {
      overallStatus: healthData.overall,
      totalServices: healthData.checks.length,
      healthyServices: healthData.summary.healthy,
      degradedServices: healthData.summary.degraded,
      unhealthyServices: healthData.summary.unhealthy,
      averageResponseTime: healthData.checks.reduce((sum: number, check: any) => sum + check.responseTime, 0) / healthData.checks.length,
      alertsTriggered: alertData.alertsTriggered,
      alertsResolved: alertData.alertsResolved,
      monitoringDuration
    };

    // 4. Log system status summary
    const statusEmoji = healthData.overall === 'healthy' ? '🟢' :
                       healthData.overall === 'degraded' ? '🟡' : '🔴';

    console.log(`${statusEmoji} System Status: ${healthData.overall.toUpperCase()}`);
    console.log(`📊 Services: ${systemMetrics.healthyServices}✅ ${systemMetrics.degradedServices}⚠️ ${systemMetrics.unhealthyServices}❌`);
    console.log(`⚡ Avg Response: ${Math.round(systemMetrics.averageResponseTime)}ms`);
    console.log(`🚨 Alerts: ${systemMetrics.alertsTriggered} new, ${systemMetrics.alertsResolved} resolved`);

    // 5. Prepare response for cron-job.org dashboard
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      monitoring: {
        status: healthData.overall,
        duration: monitoringDuration,
        version: healthData.version || 'v3-direct',
        environment: healthData.environment || process.env.NODE_ENV
      },
      system: systemMetrics,
      healthCheck: {
        overall: healthData.overall,
        services: healthData.checks.map((check: any) => ({
          service: check.service,
          status: check.status,
          responseTime: check.responseTime
        }))
      },
      alerts: {
        triggered: alertData.alertsTriggered,
        resolved: alertData.alertsResolved
      },
      summary: `${statusEmoji} ${healthData.overall} | ${systemMetrics.healthyServices}/${systemMetrics.totalServices} services OK | ${Math.round(systemMetrics.averageResponseTime)}ms avg`
    };

    // Log critical issues prominently
    if (healthData.overall === 'unhealthy') {
      console.error('🚨🚨🚨 CRITICAL: SYSTEM UNHEALTHY 🚨🚨🚨');
      const unhealthyServices = healthData.checks.filter((c: any) => c.status === 'unhealthy');
      unhealthyServices.forEach((service: any) => {
        console.error(`❌ ${service.service}: ${service.error || 'Service unavailable'}`);
      });
    }

    return NextResponse.json(response);

  } catch (error) {
    const errorDuration = Date.now() - startTime;

    console.error('🚨 CRON health monitor failed:', error);

    // Return error response for cron-job.org
    const errorResponse = {
      success: false,
      error: 'Health monitoring execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      duration: errorDuration,
      summary: '🔴 HEALTH MONITOR FAILED | System status unknown'
    };

    // Log error prominently
    console.error('🚨🚨🚨 HEALTH MONITORING SYSTEM FAILURE 🚨🚨🚨');
    console.error(`Error: ${errorResponse.details}`);
    console.error(`Duration: ${errorDuration}ms`);

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Perform health check DIRECTLY without HTTP calls
async function performDirectHealthCheck(prisma: any) {
  const startTime = Date.now();
  const checks: any[] = [];

  // 1. Database Health Check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;

    const sourceCount = await prisma.source.count();
    const articlesCount = await prisma.article.count();

    checks.push({
      service: 'database',
      status: 'healthy',
      responseTime: Date.now() - dbStart,
      details: {
        connection: 'ok',
        sources: sourceCount,
        articles: articlesCount
      }
    });
  } catch (error) {
    checks.push({
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Database connection failed'
    });
  }

  // 2. Core Functionality Check
  try {
    const coreStart = Date.now();

    const sourcesCount = await prisma.source.count();
    const activeSources = await prisma.source.count({ where: { isActive: true } });
    const articlesCount = await prisma.article.count();
    const feedItemsCount = await prisma.feedItem.count();

    checks.push({
      service: 'core-functionality',
      status: 'healthy',
      responseTime: Date.now() - coreStart,
      details: {
        sources: { total: sourcesCount, active: activeSources },
        articles: { total: articlesCount },
        feedItems: { total: feedItemsCount }
      }
    });
  } catch (error) {
    checks.push({
      service: 'core-functionality',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Core functionality check failed'
    });
  }

  // 3. RSS Sources Health Check
  try {
    const rssStart = Date.now();

    const activeSources = await prisma.source.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        url: true,
        lastFetchAt: true,
        lastFetchStatus: true
      }
    });

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const healthySources = activeSources.filter((s: any) =>
      s.lastFetchAt && s.lastFetchAt > oneHourAgo && s.lastFetchStatus === 'success'
    );

    const errorSources = activeSources.filter((s: any) =>
      s.lastFetchStatus === 'error'
    );

    const status = errorSources.length > 0 ? 'degraded' :
                  healthySources.length === activeSources.length ? 'healthy' : 'degraded';

    checks.push({
      service: 'rss-sources',
      status,
      responseTime: Date.now() - rssStart,
      details: {
        total: activeSources.length,
        healthy: healthySources.length,
        errors: errorSources.length,
        errorSources: errorSources.map((s: any) => ({ id: s.id, name: s.name }))
      }
    });
  } catch (error) {
    checks.push({
      service: 'rss-sources',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'RSS sources check failed'
    });
  }

  // 4. System Resources Check
  try {
    const sysStart = Date.now();

    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memStatus = memUsageMB > 400 ? 'degraded' : 'healthy';

    checks.push({
      service: 'system-resources',
      status: memStatus,
      responseTime: Date.now() - sysStart,
      details: {
        memoryUsageMB: memUsageMB,
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    checks.push({
      service: 'system-resources',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'System resources check failed'
    });
  }

  // Calculate overall status
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
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'v3-direct',
    uptime: Date.now() - startTime,
    environment: process.env.NODE_ENV || 'unknown',
    checks,
    summary
  };
}