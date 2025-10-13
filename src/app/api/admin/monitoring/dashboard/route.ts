import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * Admin Monitoring Dashboard API
 *
 * Provides comprehensive monitoring data for the admin dashboard including:
 * - Real-time system status
 * - Recent health checks history
 * - Active alerts
 * - Performance metrics
 * - System trends
 */

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h'; // 1h, 6h, 24h, 7d
    const includeResolved = searchParams.get('include_resolved') === 'true';

    // Calculate time range
    const now = new Date();
    const timeRange = getTimeRange(timeframe);

    // Parallel data fetching for better performance
    const [
      latestHealthCheck,
      recentHealthChecks,
      activeAlerts,
      recentAlerts,
      systemMetrics,
      serviceUptime
    ] = await Promise.all([
      // Latest health check
      prisma.healthCheck.findFirst({
        orderBy: { timestamp: 'desc' }
      }),

      // Recent health checks for trend analysis
      prisma.healthCheck.findMany({
        where: {
          timestamp: { gte: timeRange.start }
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      }),

      // Active alerts
      prisma.systemAlert.findMany({
        where: {
          status: 'active'
        },
        orderBy: [
          { severity: 'desc' },
          { triggeredAt: 'desc' }
        ]
      }),

      // Recent alerts (including resolved if requested)
      prisma.systemAlert.findMany({
        where: {
          triggeredAt: { gte: timeRange.start },
          ...(includeResolved ? {} : { status: { not: 'resolved' } })
        },
        orderBy: { triggeredAt: 'desc' },
        take: 50
      }),

      // System metrics
      getSystemMetrics(timeRange),

      // Service uptime calculations
      calculateServiceUptime(timeRange)
    ]);

    // Process health check trends
    const healthTrends = processHealthTrends(recentHealthChecks);

    // Calculate alert statistics
    const alertStats = calculateAlertStatistics(recentAlerts);

    // Build comprehensive dashboard response
    const dashboard = {
      timestamp: new Date().toISOString(),
      timeframe,
      currentStatus: {
        overall: latestHealthCheck?.status || 'unknown',
        lastCheck: latestHealthCheck?.timestamp || null,
        version: latestHealthCheck ? JSON.parse(latestHealthCheck.details as string)?.version : null,
        uptime: latestHealthCheck ? JSON.parse(latestHealthCheck.details as string)?.uptime : null,
        environment: latestHealthCheck ? JSON.parse(latestHealthCheck.details as string)?.environment : null
      },
      alerts: {
        active: {
          total: activeAlerts.length,
          critical: activeAlerts.filter(a => a.severity === 'critical').length,
          high: activeAlerts.filter(a => a.severity === 'high').length,
          medium: activeAlerts.filter(a => a.severity === 'medium').length,
          low: activeAlerts.filter(a => a.severity === 'low').length,
          alerts: activeAlerts.map(formatAlertForDashboard)
        },
        recent: {
          total: recentAlerts.length,
          ...alertStats,
          alerts: recentAlerts.slice(0, 10).map(formatAlertForDashboard)
        }
      },
      metrics: {
        system: systemMetrics,
        uptime: serviceUptime,
        trends: healthTrends
      },
      services: latestHealthCheck ?
        JSON.parse(latestHealthCheck.details as string)?.checks?.map((check: any) => ({
          name: check.service,
          status: check.status,
          responseTime: check.responseTime,
          details: check.details,
          error: check.error
        })) || [] : []
    };

    return NextResponse.json({
      success: true,
      dashboard
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to load monitoring dashboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getTimeRange(timeframe: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (timeframe) {
    case '1h':
      start.setHours(start.getHours() - 1);
      break;
    case '6h':
      start.setHours(start.getHours() - 6);
      break;
    case '24h':
      start.setHours(start.getHours() - 24);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    default:
      start.setHours(start.getHours() - 24);
  }

  return { start, end };
}

async function getSystemMetrics(timeRange: { start: Date; end: Date }) {
  const healthChecks = await prisma.healthCheck.findMany({
    where: {
      timestamp: { gte: timeRange.start }
    },
    orderBy: { timestamp: 'desc' }
  });

  if (healthChecks.length === 0) {
    return {
      averageResponseTime: null,
      healthyPercentage: null,
      totalChecks: 0,
      errorRate: null
    };
  }

  const totalResponseTime = healthChecks.reduce((sum, check) => sum + check.responseTime, 0);
  const healthyChecks = healthChecks.filter(check => check.status === 'healthy').length;
  const errorChecks = healthChecks.filter(check => check.status === 'unhealthy').length;

  return {
    averageResponseTime: Math.round(totalResponseTime / healthChecks.length),
    healthyPercentage: Math.round((healthyChecks / healthChecks.length) * 100),
    totalChecks: healthChecks.length,
    errorRate: Math.round((errorChecks / healthChecks.length) * 100)
  };
}

async function calculateServiceUptime(timeRange: { start: Date; end: Date }) {
  const healthChecks = await prisma.healthCheck.findMany({
    where: {
      timestamp: { gte: timeRange.start }
    },
    orderBy: { timestamp: 'asc' }
  });

  if (healthChecks.length === 0) return {};

  const serviceUptime: Record<string, { uptime: number; total: number }> = {};

  healthChecks.forEach(check => {
    try {
      const details = JSON.parse(check.details as string);
      details.checks?.forEach((serviceCheck: any) => {
        if (!serviceUptime[serviceCheck.service]) {
          serviceUptime[serviceCheck.service] = { uptime: 0, total: 0 };
        }
        serviceUptime[serviceCheck.service].total++;
        if (serviceCheck.status === 'healthy') {
          serviceUptime[serviceCheck.service].uptime++;
        }
      });
    } catch (error) {
      // Skip invalid JSON
    }
  });

  // Convert to percentages
  const uptimePercentages: Record<string, number> = {};
  Object.entries(serviceUptime).forEach(([service, stats]) => {
    uptimePercentages[service] = Math.round((stats.uptime / stats.total) * 100);
  });

  return uptimePercentages;
}

function processHealthTrends(healthChecks: any[]) {
  if (healthChecks.length === 0) return { responseTime: [], status: [] };

  const responseTimeTrend = healthChecks
    .slice(0, 20) // Last 20 checks
    .reverse()
    .map(check => ({
      timestamp: check.timestamp,
      value: check.responseTime
    }));

  const statusTrend = healthChecks
    .slice(0, 50) // Last 50 checks
    .reverse()
    .map(check => ({
      timestamp: check.timestamp,
      status: check.status
    }));

  return {
    responseTime: responseTimeTrend,
    status: statusTrend
  };
}

function calculateAlertStatistics(alerts: any[]) {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last1h = new Date(now.getTime() - 60 * 60 * 1000);

  return {
    last24h: alerts.filter(a => a.triggeredAt > last24h).length,
    last1h: alerts.filter(a => a.triggeredAt > last1h).length,
    byService: alerts.reduce((acc: Record<string, number>, alert) => {
      acc[alert.service] = (acc[alert.service] || 0) + 1;
      return acc;
    }, {}),
    bySeverity: alerts.reduce((acc: Record<string, number>, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {})
  };
}

function formatAlertForDashboard(alert: any) {
  return {
    id: alert.id,
    type: alert.type,
    service: alert.service,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    status: alert.status,
    triggeredAt: alert.triggeredAt,
    resolvedAt: alert.resolvedAt,
    occurrenceCount: alert.occurrenceCount,
    duration: alert.resolvedAt ?
      Math.round((alert.resolvedAt.getTime() - alert.triggeredAt.getTime()) / (1000 * 60)) :
      Math.round((Date.now() - alert.triggeredAt.getTime()) / (1000 * 60))
  };
}