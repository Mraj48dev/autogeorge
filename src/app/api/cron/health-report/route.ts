import { NextRequest, NextResponse } from 'next/server';

/**
 * CRON Health Report - Email Summary ogni 12 ore
 *
 * Questo endpoint genera report dettagliati dello stato della piattaforma
 * e invia email summary ogni 12 ore.
 *
 * URL CRON: https://autogeorge.vercel.app/api/cron/health-report
 * Frequenza: Ogni 12 ore (0 */12 * * *)
 *
 * Funzionalità:
 * - Analizza ultimi 12 ore di health checks
 * - Calcola uptime, performance trends, errori
 * - Genera email HTML con grafici e metriche
 * - Salva report su database
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    console.log('📊 Starting Health Report generation...');

    const { prisma } = await import('@/shared/database/prisma');
    const { createNotificationService } = await import('@/shared/services/notification-service');

    // 1. Calcola timeframe (ultime 12 ore)
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    // 2. Recupera health checks recenti
    const healthChecks = await prisma.healthCheck.findMany({
      where: {
        timestamp: { gte: twelveHoursAgo }
      },
      orderBy: { timestamp: 'desc' },
      take: 144 // Max 144 checks (ogni 5 min x 12 ore)
    });

    // 3. Recupera alert recenti
    const recentAlerts = await prisma.systemAlert.findMany({
      where: {
        triggeredAt: { gte: twelveHoursAgo }
      },
      orderBy: { triggeredAt: 'desc' }
    });

    // 4. Esegui health check corrente
    const currentHealth = await getCurrentHealthStatus(prisma);

    // 5. Genera analisi completa
    const analysis = await generateHealthAnalysis(healthChecks, recentAlerts, currentHealth);

    // 6. Crea report HTML
    const htmlReport = generateHtmlReport(analysis, twelveHoursAgo, now);

    // 7. Invia email se configurata
    let emailSent = false;
    if (process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true' && process.env.EMAIL_RECIPIENTS) {
      const notificationService = createNotificationService();

      const notificationResult = await notificationService.sendNotification({
        type: 'system_status',
        severity: analysis.currentHealth.overall === 'healthy' ? 'low' :
                 analysis.currentHealth.overall === 'degraded' ? 'medium' : 'high',
        title: `AutoGeorge Health Report - ${analysis.currentHealth.overall.toUpperCase()}`,
        message: `Sistema ${analysis.currentHealth.overall} | Uptime: ${analysis.uptime.percentage}% | ${analysis.alerts.total} alert in 12h`,
        timestamp: now.toISOString(),
        details: {
          reportPeriod: '12 hours',
          overallStatus: analysis.currentHealth.overall,
          uptime: analysis.uptime.percentage,
          totalAlerts: analysis.alerts.total,
          criticalAlerts: analysis.alerts.critical,
          servicesStatus: analysis.servicesStatus
        },
        metadata: {
          reportType: 'health_summary',
          htmlContent: htmlReport
        }
      });

      emailSent = notificationResult.success;
      console.log(`📧 Email report sent: ${emailSent} (${notificationResult.successfulChannels}/${notificationResult.totalChannels} channels)`);
    }

    // 8. Salva report su database
    const savedReport = await prisma.healthReport.create({
      data: {
        timestamp: now,
        reportType: 'summary_12h',
        periodStart: twelveHoursAgo,
        periodEnd: now,
        overallStatus: analysis.currentHealth.overall,
        totalChecks: analysis.totalChecks,
        uptimePercentage: analysis.uptime.percentage,
        totalAlerts: analysis.alerts.total,
        criticalAlerts: analysis.alerts.critical,
        averageResponseTime: analysis.performance.averageResponseTime,
        reportData: JSON.stringify(analysis),
        htmlReport: htmlReport,
        emailSent: emailSent
      }
    });

    console.log(`✅ Health Report completed: ${analysis.currentHealth.overall} (${Date.now() - startTime}ms)`);

    // 9. Response per cron-job.org
    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      report: {
        id: savedReport.id,
        period: '12 hours',
        overallStatus: analysis.currentHealth.overall,
        uptime: `${analysis.uptime.percentage}%`,
        totalAlerts: analysis.alerts.total,
        criticalAlerts: analysis.alerts.critical,
        emailSent: emailSent
      },
      analysis: {
        healthChecks: analysis.totalChecks,
        servicesStatus: analysis.servicesStatus,
        performance: analysis.performance
      },
      summary: `📊 Report: ${analysis.currentHealth.overall} | Uptime: ${analysis.uptime.percentage}% | Alerts: ${analysis.alerts.total} | Email: ${emailSent ? '✅' : '❌'}`
    });

  } catch (error) {
    console.error('🚨 Health Report generation failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Health report generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      summary: '🔴 HEALTH REPORT FAILED'
    }, { status: 500 });
  }
}

async function getCurrentHealthStatus(prisma: any) {
  // Riusa la logica del monitoring endpoint
  const checks: any[] = [];

  // Database check
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
      responseTime: 1000,
      error: error instanceof Error ? error.message : 'DB failed'
    });
  }

  // Core data check
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
      responseTime: 1000,
      error: error instanceof Error ? error.message : 'Core data failed'
    });
  }

  // RSS sources check
  try {
    const rssStart = Date.now();
    const activeSources = await prisma.source.findMany({
      where: { isActive: true },
      select: { id: true, lastFetchStatus: true, lastFetchAt: true }
    });

    const now = new Date();
    const recentThreshold = new Date(now.getTime() - 2 * 60 * 60 * 1000);

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
      details: { total: activeSources.length, recentSuccessful: recentSuccessful.length }
    });
  } catch (error) {
    checks.push({
      service: 'rss-sources',
      status: 'unhealthy',
      responseTime: 1000,
      error: error instanceof Error ? error.message : 'RSS check failed'
    });
  }

  // System resources
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
      responseTime: 1000,
      error: error instanceof Error ? error.message : 'System check failed'
    });
  }

  const summary = {
    healthy: checks.filter(c => c.status === 'healthy').length,
    degraded: checks.filter(c => c.status === 'degraded').length,
    unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    total: checks.length
  };

  const overall = summary.unhealthy > 0 ? 'unhealthy' :
                 summary.degraded > 0 ? 'degraded' : 'healthy';

  return { overall, checks, summary };
}

async function generateHealthAnalysis(healthChecks: any[], alerts: any[], currentHealth: any) {
  const totalChecks = healthChecks.length;

  // Calcola uptime
  const healthyChecks = healthChecks.filter(hc => hc.status === 'healthy').length;
  const uptimePercentage = totalChecks > 0 ? Math.round((healthyChecks / totalChecks) * 100) : 100;

  // Analizza performance
  const avgResponseTime = totalChecks > 0 ?
    Math.round(healthChecks.reduce((sum, hc) => sum + hc.responseTime, 0) / totalChecks) : 0;

  // Analizza alert
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const highAlerts = alerts.filter(a => a.severity === 'high').length;
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved').length;

  // Status dei servizi
  const servicesStatus = currentHealth.checks.reduce((acc: any, check: any) => {
    acc[check.service] = {
      status: check.status,
      responseTime: check.responseTime,
      details: check.details
    };
    return acc;
  }, {});

  // Trend analysis (ultimi vs primi check)
  const recentChecks = healthChecks.slice(0, 12); // Ultima ora
  const earlierChecks = healthChecks.slice(-12); // Prima ora del periodo

  const recentHealthy = recentChecks.filter(hc => hc.status === 'healthy').length;
  const earlierHealthy = earlierChecks.filter(hc => hc.status === 'healthy').length;

  const trend = recentHealthy > earlierHealthy ? 'improving' :
               recentHealthy < earlierHealthy ? 'degrading' : 'stable';

  return {
    totalChecks,
    uptime: {
      percentage: uptimePercentage,
      healthyChecks,
      totalChecks
    },
    performance: {
      averageResponseTime: avgResponseTime
    },
    alerts: {
      total: alerts.length,
      critical: criticalAlerts,
      high: highAlerts,
      resolved: resolvedAlerts,
      active: alerts.length - resolvedAlerts
    },
    currentHealth,
    servicesStatus,
    trend
  };
}

function generateHtmlReport(analysis: any, periodStart: Date, periodEnd: Date): string {
  const statusColor = analysis.currentHealth.overall === 'healthy' ? '#10b981' :
                     analysis.currentHealth.overall === 'degraded' ? '#f59e0b' : '#ef4444';

  const statusEmoji = analysis.currentHealth.overall === 'healthy' ? '🟢' :
                     analysis.currentHealth.overall === 'degraded' ? '🟡' : '🔴';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header { background: ${statusColor}; color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8fafc; padding: 20px; border-radius: 6px; border-left: 4px solid ${statusColor}; }
        .metric-card h3 { margin: 0 0 10px 0; color: #374151; font-size: 14px; text-transform: uppercase; }
        .metric-card .value { font-size: 24px; font-weight: bold; color: #1f2937; }
        .service-status { margin: 20px 0; }
        .service-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; margin: 8px 0; border-radius: 4px; }
        .service-name { font-weight: 500; }
        .service-badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .badge-healthy { background: #dcfce7; color: #166534; }
        .badge-degraded { background: #fef3c7; color: #92400e; }
        .badge-unhealthy { background: #fee2e2; color: #991b1b; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        .alert-section { margin: 20px 0; }
        .alert-item { padding: 12px; background: #fef2f2; border-left: 4px solid #ef4444; margin: 8px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${statusEmoji} AutoGeorge Health Report</h1>
            <p>Sistema: ${analysis.currentHealth.overall.toUpperCase()} | Periodo: ${periodStart.toLocaleString('it')} - ${periodEnd.toLocaleString('it')}</p>
        </div>

        <div class="content">
            <div class="metric-grid">
                <div class="metric-card">
                    <h3>Uptime</h3>
                    <div class="value">${analysis.uptime.percentage}%</div>
                </div>
                <div class="metric-card">
                    <h3>Controlli Totali</h3>
                    <div class="value">${analysis.totalChecks}</div>
                </div>
                <div class="metric-card">
                    <h3>Tempo Risposta Medio</h3>
                    <div class="value">${analysis.performance.averageResponseTime}ms</div>
                </div>
                <div class="metric-card">
                    <h3>Alert Totali</h3>
                    <div class="value">${analysis.alerts.total}</div>
                </div>
            </div>

            <h2>Stato Servizi</h2>
            <div class="service-status">
                ${Object.entries(analysis.servicesStatus).map(([service, status]: [string, any]) => `
                    <div class="service-item">
                        <span class="service-name">${service}</span>
                        <span class="service-badge badge-${status.status}">${status.status} (${status.responseTime}ms)</span>
                    </div>
                `).join('')}
            </div>

            ${analysis.alerts.total > 0 ? `
            <h2>Alert Recenti</h2>
            <div class="alert-section">
                <p><strong>${analysis.alerts.critical}</strong> critici, <strong>${analysis.alerts.high}</strong> alti, <strong>${analysis.alerts.resolved}</strong> risolti</p>
            </div>
            ` : ''}

            <h2>Tendenza</h2>
            <p>Trend sistema: <strong>${analysis.trend}</strong></p>
        </div>

        <div class="footer">
            AutoGeorge Health Monitoring System | Report generato automaticamente ogni 12 ore<br>
            Per assistenza: monitora i log su Vercel o usa gli script di rollback se necessario
        </div>
    </div>
</body>
</html>
`;
}