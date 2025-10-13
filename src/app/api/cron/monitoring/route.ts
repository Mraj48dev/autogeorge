import { NextRequest, NextResponse } from 'next/server';

/**
 * CRON Monitoring Endpoint - AutoGeorge
 *
 * Questo endpoint è progettato per essere chiamato da cron-job.org ogni 5 minuti
 * per monitorare continuamente lo stato del sistema e generare alert automatici.
 *
 * URL CRON: https://autogeorge.vercel.app/api/cron/monitoring
 * Frequenza: Ogni 5 minuti (cron: every 5 minutes)
 *
 * Flusso:
 * 1. Esegue comprehensive health check
 * 2. Processa gli alert in base ai risultati
 * 3. Invia notifiche se necessario
 * 4. Salva metriche storiche
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    console.log('🔍 Starting CRON monitoring check v2...');

    // 1. Execute comprehensive health check
    const baseUrl = process.env.VERCEL_URL ?
      `https://${process.env.VERCEL_URL}` :
      'https://autogeorge.vercel.app';

    const healthResponse = await fetch(`${baseUrl}/api/health/comprehensive`, {
      method: 'GET',
      headers: {
        'User-Agent': 'AutoGeorge-CRON-Monitor',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    // Accept 200 (healthy), 207 (degraded), but not 503 (unhealthy)
    if (healthResponse.status !== 200 && healthResponse.status !== 207) {
      throw new Error(`Health check failed with status: ${healthResponse.status}`);
    }

    const healthData = await healthResponse.json();
    console.log(`✅ Health check completed: ${healthData.overall} (${healthData.checks.length} services)`);

    // 2. Process alerts based on health data
    const alertResponse = await fetch(`${baseUrl}/api/health/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AutoGeorge-CRON-Monitor'
      },
      body: JSON.stringify(healthData),
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    let alertData = { alertsTriggered: 0, alertsResolved: 0 };
    if (alertResponse.ok) {
      alertData = await alertResponse.json();
      console.log(`🚨 Alerts processed: ${alertData.alertsTriggered} triggered, ${alertData.alertsResolved} resolved`);
    } else {
      console.warn('⚠️ Alert processing failed, continuing...');
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
        version: healthData.version,
        environment: healthData.environment
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

    console.error('🚨 CRON monitoring failed:', error);

    // Return error response for cron-job.org
    const errorResponse = {
      success: false,
      error: 'Monitoring execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      duration: errorDuration,
      summary: '🔴 MONITOR FAILED | System status unknown'
    };

    // Log error prominently
    console.error('🚨🚨🚨 MONITORING SYSTEM FAILURE 🚨🚨🚨');
    console.error(`Error: ${errorResponse.details}`);
    console.error(`Duration: ${errorDuration}ms`);

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// POST endpoint for manual monitoring trigger (admin use)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { force = false } = await request.json().catch(() => ({}));

    console.log('🔧 Manual monitoring trigger initiated', { force });

    // Delegate to GET handler
    return await GET(request);

  } catch (error) {
    console.error('Manual monitoring trigger failed:', error);
    return NextResponse.json(
      {
        error: 'Manual monitoring failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}