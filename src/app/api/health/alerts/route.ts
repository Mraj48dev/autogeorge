import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

interface AlertRule {
  type: string;
  service: string;
  condition: (healthData: any) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  cooldownMinutes: number;
}

const ALERT_RULES: AlertRule[] = [
  {
    type: 'service_down',
    service: 'database',
    condition: (data) => data.checks?.find((c: any) => c.service === 'database')?.status === 'unhealthy',
    severity: 'critical',
    title: 'Database Service Down',
    message: 'Database connection failed - system is offline',
    cooldownMinutes: 5
  },
  {
    type: 'service_degraded',
    service: 'api',
    condition: (data) => {
      const apiChecks = data.checks?.filter((c: any) => c.service.includes('admin') || c.service.includes('cron'));
      return apiChecks?.some((c: any) => c.status === 'unhealthy');
    },
    severity: 'high',
    title: 'API Services Degraded',
    message: 'One or more API endpoints are failing',
    cooldownMinutes: 10
  },
  {
    type: 'rss_feeds_failing',
    service: 'rss-sources',
    condition: (data) => {
      const rssCheck = data.checks?.find((c: any) => c.service === 'rss-sources');
      return rssCheck?.status === 'degraded' && rssCheck?.details?.errors > 0;
    },
    severity: 'medium',
    title: 'RSS Feeds Failing',
    message: 'Multiple RSS sources are experiencing errors',
    cooldownMinutes: 30
  },
  {
    type: 'performance_degraded',
    service: 'system',
    condition: (data) => {
      const avgResponseTime = data.checks?.reduce((sum: number, c: any) => sum + c.responseTime, 0) / (data.checks?.length || 1);
      return avgResponseTime > 5000; // 5 seconds
    },
    severity: 'medium',
    title: 'Performance Degraded',
    message: 'System response times are higher than normal',
    cooldownMinutes: 15
  },
  {
    type: 'memory_high',
    service: 'system-resources',
    condition: (data) => {
      const systemCheck = data.checks?.find((c: any) => c.service === 'system-resources');
      return systemCheck?.details?.memoryUsageMB > 400;
    },
    severity: 'medium',
    title: 'High Memory Usage',
    message: 'System memory usage is elevated',
    cooldownMinutes: 20
  },
  {
    type: 'external_api_down',
    service: 'perplexity-ai',
    condition: (data) => data.checks?.find((c: any) => c.service === 'perplexity-ai')?.status === 'unhealthy',
    severity: 'high',
    title: 'AI Service Unavailable',
    message: 'Perplexity AI API is not responding',
    cooldownMinutes: 15
  }
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const healthData = await request.json();

    const alertsTriggered = [];
    const alertsResolved = [];

    // Check each alert rule
    for (const rule of ALERT_RULES) {
      const shouldAlert = rule.condition(healthData);

      // Find existing active alert for this type/service
      const existingAlert = await prisma.systemAlert.findFirst({
        where: {
          type: rule.type,
          service: rule.service,
          status: 'active'
        },
        orderBy: { createdAt: 'desc' }
      });

      if (shouldAlert) {
        if (!existingAlert) {
          // Create new alert
          const newAlert = await prisma.systemAlert.create({
            data: {
              type: rule.type,
              service: rule.service,
              severity: rule.severity,
              status: 'active',
              title: rule.title,
              message: rule.message,
              details: JSON.stringify({
                healthData: healthData,
                rule: rule,
                triggeredBy: 'automated_health_check'
              }),
              triggeredAt: new Date(),
              occurrenceCount: 1,
              lastOccurrence: new Date()
            }
          });

          alertsTriggered.push(newAlert);
        } else {
          // Update existing alert occurrence count and last occurrence
          const updatedAlert = await prisma.systemAlert.update({
            where: { id: existingAlert.id },
            data: {
              occurrenceCount: existingAlert.occurrenceCount + 1,
              lastOccurrence: new Date(),
              details: JSON.stringify({
                ...JSON.parse(existingAlert.details as string),
                latestHealthData: healthData,
                lastUpdate: new Date().toISOString()
              })
            }
          });

          // Check if we should send another notification (cooldown logic)
          const minutesSinceTriggered = (Date.now() - existingAlert.triggeredAt.getTime()) / (1000 * 60);
          if (minutesSinceTriggered >= rule.cooldownMinutes) {
            alertsTriggered.push(updatedAlert);
          }
        }
      } else {
        // Should not alert - check if we need to resolve existing alert
        if (existingAlert) {
          const resolvedAlert = await prisma.systemAlert.update({
            where: { id: existingAlert.id },
            data: {
              status: 'resolved',
              resolvedAt: new Date(),
              details: JSON.stringify({
                ...JSON.parse(existingAlert.details as string),
                resolvedBy: 'automated_health_check',
                resolvedAt: new Date().toISOString(),
                resolutionHealthData: healthData
              })
            }
          });

          alertsResolved.push(resolvedAlert);
        }
      }
    }

    // Send notifications for triggered alerts
    for (const alert of alertsTriggered) {
      await sendAlertNotification(alert, 'triggered');
    }

    // Send notifications for resolved alerts
    for (const alert of alertsResolved) {
      await sendAlertNotification(alert, 'resolved');
    }

    return NextResponse.json({
      success: true,
      alertsTriggered: alertsTriggered.length,
      alertsResolved: alertsResolved.length,
      details: {
        triggered: alertsTriggered.map(a => ({ id: a.id, type: a.type, service: a.service, severity: a.severity })),
        resolved: alertsResolved.map(a => ({ id: a.id, type: a.type, service: a.service }))
      }
    });

  } catch (error) {
    console.error('Alert processing error:', error);
    return NextResponse.json(
      { error: 'Alert processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function sendAlertNotification(alert: any, action: 'triggered' | 'resolved'): Promise<void> {
  try {
    // Import notification service dynamically to avoid circular deps
    const { createNotificationService } = await import('@/shared/services/notification-service');
    const notificationService = createNotificationService();

    // Prepare notification payload
    const notificationPayload = {
      type: action === 'triggered' ? 'alert_triggered' as const : 'alert_resolved' as const,
      severity: alert.severity,
      title: action === 'triggered' ? alert.title : `RESOLVED: ${alert.title}`,
      message: action === 'triggered' ?
        alert.message :
        `Alert has been resolved. Original issue: ${alert.message}`,
      service: alert.service,
      timestamp: new Date().toISOString(),
      details: {
        alertId: alert.id,
        alertType: alert.type,
        occurrenceCount: alert.occurrenceCount,
        duration: action === 'resolved' && alert.resolvedAt ?
          Math.round((alert.resolvedAt.getTime() - alert.triggeredAt.getTime()) / (1000 * 60)) :
          Math.round((Date.now() - alert.triggeredAt.getTime()) / (1000 * 60))
      }
    };

    // Send notification through all configured channels
    const result = await notificationService.sendNotification(notificationPayload);

    // Track notification results
    const notificationData = {
      timestamp: new Date().toISOString(),
      action,
      result,
      alert: {
        id: alert.id,
        type: alert.type,
        service: alert.service,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        occurrenceCount: alert.occurrenceCount
      }
    };

    // Update notifications sent tracking
    const currentNotifications = alert.notificationsSent ? JSON.parse(alert.notificationsSent) : [];
    currentNotifications.push(notificationData);

    await prisma.systemAlert.update({
      where: { id: alert.id },
      data: {
        notificationsSent: JSON.stringify(currentNotifications)
      }
    });

    console.log(`📬 Notification sent: ${result.successfulChannels}/${result.totalChannels} channels successful`);

  } catch (error) {
    console.error('Failed to send alert notification:', error);
  }
}

// GET endpoint to retrieve active alerts
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const severity = searchParams.get('severity');
    const service = searchParams.get('service');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (service) where.service = service;

    const alerts = await prisma.systemAlert.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { triggeredAt: 'desc' }
      ],
      take: limit
    });

    const summary = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length,
      active: alerts.filter(a => a.status === 'active').length,
      resolved: alerts.filter(a => a.status === 'resolved').length
    };

    return NextResponse.json({
      success: true,
      alerts,
      summary,
      pagination: {
        limit,
        returned: alerts.length
      }
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve alerts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}