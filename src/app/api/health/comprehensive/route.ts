import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: any;
  error?: string;
}

interface ComprehensiveHealthResponse {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks: HealthCheckResult[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const checks: HealthCheckResult[] = [];

  // 1. Database Health Check
  await checkDatabase(checks);

  // 2. API Endpoints Health Check
  await checkCriticalEndpoints(checks);

  // 3. RSS Sources Health Check
  await checkRssSources(checks);

  // 4. External Services Health Check
  await checkExternalServices(checks);

  // 5. System Resources Check
  await checkSystemResources(checks);

  // Calculate overall health
  const summary = {
    healthy: checks.filter(c => c.status === 'healthy').length,
    degraded: checks.filter(c => c.status === 'degraded').length,
    unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    total: checks.length
  };

  const overall: 'healthy' | 'degraded' | 'unhealthy' =
    summary.unhealthy > 0 ? 'unhealthy' :
    summary.degraded > 0 ? 'degraded' : 'healthy';

  const response: ComprehensiveHealthResponse = {
    overall,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown',
    uptime: Date.now() - startTime,
    environment: process.env.NODE_ENV || 'unknown',
    checks,
    summary
  };

  // Log unhealthy services
  if (overall !== 'healthy') {
    console.error('🚨 Health Check Issues:', {
      overall,
      unhealthy: checks.filter(c => c.status === 'unhealthy'),
      degraded: checks.filter(c => c.status === 'degraded')
    });
  }

  // Store health check result in database
  try {
    await prisma.healthCheck.create({
      data: {
        timestamp: new Date(),
        status: overall,
        responseTime: Date.now() - startTime,
        details: JSON.stringify(response)
      }
    });
  } catch (error) {
    console.error('Failed to store health check:', error);
  }

  // Return appropriate HTTP status
  const httpStatus = overall === 'healthy' ? 200 :
                    overall === 'degraded' ? 207 : 503;

  return NextResponse.json(response, { status: httpStatus });
}

async function checkDatabase(checks: HealthCheckResult[]): Promise<void> {
  const start = Date.now();

  try {
    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1`;

    // Test table access
    const sourceCount = await prisma.source.count();
    const articlesCount = await prisma.article.count();

    checks.push({
      service: 'database',
      status: 'healthy',
      responseTime: Date.now() - start,
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
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database connection failed'
    });
  }
}

async function checkCriticalEndpoints(checks: HealthCheckResult[]): Promise<void> {
  const endpoints = [
    { name: 'health-basic', path: '/api/health' },
    { name: 'admin-sources', path: '/api/admin/sources' },
    { name: 'cron-poll', path: '/api/cron/poll-feeds' }
  ];

  for (const endpoint of endpoints) {
    const start = Date.now();

    try {
      const baseUrl = process.env.VERCEL_URL ?
        `https://${process.env.VERCEL_URL}` :
        'https://autogeorge.vercel.app';

      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'AutoGeorge-Health-Check',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const status = response.ok ? 'healthy' : 'degraded';

      checks.push({
        service: endpoint.name,
        status,
        responseTime: Date.now() - start,
        details: {
          httpStatus: response.status,
          url: endpoint.path
        }
      });
    } catch (error) {
      checks.push({
        service: endpoint.name,
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Endpoint unreachable'
      });
    }
  }
}

async function checkRssSources(checks: HealthCheckResult[]): Promise<void> {
  const start = Date.now();

  try {
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

    const healthySources = activeSources.filter(s =>
      s.lastFetchAt && s.lastFetchAt > oneHourAgo && s.lastFetchStatus === 'success'
    );

    const staleStatuses = activeSources.filter(s =>
      !s.lastFetchAt || s.lastFetchAt <= oneHourAgo
    );

    const errorSources = activeSources.filter(s =>
      s.lastFetchStatus === 'error'
    );

    const status = errorSources.length > 0 ? 'degraded' :
                  staleStatuses.length > activeSources.length / 2 ? 'degraded' : 'healthy';

    checks.push({
      service: 'rss-sources',
      status,
      responseTime: Date.now() - start,
      details: {
        total: activeSources.length,
        healthy: healthySources.length,
        stale: staleStatuses.length,
        errors: errorSources.length,
        errorSources: errorSources.map(s => ({ id: s.id, name: s.name }))
      }
    });
  } catch (error) {
    checks.push({
      service: 'rss-sources',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'RSS sources check failed'
    });
  }
}

async function checkExternalServices(checks: HealthCheckResult[]): Promise<void> {
  // Check Perplexity AI API
  const start = Date.now();

  try {
    if (process.env.PERPLEXITY_API_KEY) {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        }),
        signal: AbortSignal.timeout(5000)
      });

      checks.push({
        service: 'perplexity-ai',
        status: response.ok ? 'healthy' : 'degraded',
        responseTime: Date.now() - start,
        details: { httpStatus: response.status }
      });
    } else {
      checks.push({
        service: 'perplexity-ai',
        status: 'degraded',
        responseTime: Date.now() - start,
        details: { message: 'API key not configured' }
      });
    }
  } catch (error) {
    checks.push({
      service: 'perplexity-ai',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Perplexity API unreachable'
    });
  }
}

async function checkSystemResources(checks: HealthCheckResult[]): Promise<void> {
  const start = Date.now();

  try {
    // Check memory usage (if available)
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    // Simple heuristics for memory health
    const memStatus = memUsageMB > 512 ? 'degraded' : 'healthy';

    checks.push({
      service: 'system-resources',
      status: memStatus,
      responseTime: Date.now() - start,
      details: {
        memoryUsageMB: memUsageMB,
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        externalMB: Math.round(memUsage.external / 1024 / 1024),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    checks.push({
      service: 'system-resources',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'System resources check failed'
    });
  }
}