import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * POST /api/admin/test-wordpress
 * Tests WordPress connectivity before attempting to publish
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteUrl, username, password } = body;

    if (!siteUrl || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: siteUrl, username, password' },
        { status: 400 }
      );
    }

    // Normalize site URL
    let baseUrl = siteUrl.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    baseUrl = baseUrl.replace(/\/$/, '');

    const testResults = {
      siteUrl: baseUrl,
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    };

    // Test 1: Basic connectivity to site
    try {
      console.log('🔍 [WordPress Test] Testing basic connectivity...');
      const basicResponse = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'AutoGeorge/1.0 WordPress Tester'
        },
        signal: AbortSignal.timeout(10000)
      });

      testResults.tests.push({
        name: 'Basic Connectivity',
        status: basicResponse.ok ? 'success' : 'warning',
        message: basicResponse.ok
          ? `Site accessible (${basicResponse.status})`
          : `Site returned ${basicResponse.status}: ${basicResponse.statusText}`,
        details: {
          status: basicResponse.status,
          statusText: basicResponse.statusText,
          contentType: basicResponse.headers.get('content-type')
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Basic Connectivity',
        status: 'error',
        message: 'Cannot reach site',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }

    // Test 2: WordPress REST API discovery
    try {
      console.log('🔍 [WordPress Test] Testing REST API discovery...');
      const apiDiscoveryResponse = await fetch(`${baseUrl}/wp-json`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AutoGeorge/1.0 WordPress Tester'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (apiDiscoveryResponse.ok) {
        const apiData = await apiDiscoveryResponse.json();
        testResults.tests.push({
          name: 'REST API Discovery',
          status: 'success',
          message: 'WordPress REST API is available',
          details: {
            name: apiData.name || 'Unknown',
            description: apiData.description || 'No description',
            version: apiData.version || 'Unknown',
            namespaces: apiData.namespaces || []
          }
        });
      } else {
        const responseText = await apiDiscoveryResponse.text();
        testResults.tests.push({
          name: 'REST API Discovery',
          status: 'error',
          message: `REST API not accessible (${apiDiscoveryResponse.status})`,
          details: {
            status: apiDiscoveryResponse.status,
            statusText: apiDiscoveryResponse.statusText,
            responsePreview: responseText.substring(0, 200),
            isHtml: responseText.includes('<!DOCTYPE') || responseText.includes('<html>')
          }
        });
      }
    } catch (error) {
      testResults.tests.push({
        name: 'REST API Discovery',
        status: 'error',
        message: 'REST API discovery failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }

    // Test 3: Authentication test
    try {
      console.log('🔍 [WordPress Test] Testing authentication...');
      const authHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'User-Agent': 'AutoGeorge/1.0 WordPress Tester'
      };

      const authResponse = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
        method: 'GET',
        headers: authHeaders,
        signal: AbortSignal.timeout(10000)
      });

      if (authResponse.ok) {
        const userData = await authResponse.json();
        testResults.tests.push({
          name: 'Authentication',
          status: 'success',
          message: 'Authentication successful',
          details: {
            user: userData.name || userData.username || 'Unknown',
            id: userData.id,
            roles: userData.roles || [],
            capabilities: userData.capabilities ? Object.keys(userData.capabilities).length : 'Unknown'
          }
        });
      } else {
        const responseText = await authResponse.text();
        testResults.tests.push({
          name: 'Authentication',
          status: 'error',
          message: `Authentication failed (${authResponse.status})`,
          details: {
            status: authResponse.status,
            statusText: authResponse.statusText,
            responsePreview: responseText.substring(0, 200),
            isHtml: responseText.includes('<!DOCTYPE') || responseText.includes('<html>')
          }
        });
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Authentication',
        status: 'error',
        message: 'Authentication test failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }

    // Test 4: Posts API test
    try {
      console.log('🔍 [WordPress Test] Testing posts API...');
      const postsResponse = await fetch(`${baseUrl}/wp-json/wp/v2/posts?per_page=1`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
          'User-Agent': 'AutoGeorge/1.0 WordPress Tester'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (postsResponse.ok) {
        const posts = await postsResponse.json();
        testResults.tests.push({
          name: 'Posts API',
          status: 'success',
          message: 'Posts API accessible',
          details: {
            postsCount: Array.isArray(posts) ? posts.length : 'Unknown',
            canRead: true
          }
        });
      } else {
        const responseText = await postsResponse.text();
        testResults.tests.push({
          name: 'Posts API',
          status: 'error',
          message: `Posts API not accessible (${postsResponse.status})`,
          details: {
            status: postsResponse.status,
            statusText: postsResponse.statusText,
            responsePreview: responseText.substring(0, 200),
            isHtml: responseText.includes('<!DOCTYPE') || responseText.includes('<html>')
          }
        });
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Posts API',
        status: 'error',
        message: 'Posts API test failed',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }

    // Calculate overall status
    const errorCount = testResults.tests.filter(t => t.status === 'error').length;
    const warningCount = testResults.tests.filter(t => t.status === 'warning').length;
    const successCount = testResults.tests.filter(t => t.status === 'success').length;

    const overallStatus = errorCount > 0 ? 'error' :
                         warningCount > 0 ? 'warning' : 'success';

    return NextResponse.json({
      success: true,
      data: {
        ...testResults,
        summary: {
          status: overallStatus,
          total: testResults.tests.length,
          success: successCount,
          warning: warningCount,
          error: errorCount,
          readyForPublishing: errorCount === 0 && successCount >= 3
        }
      }
    });

  } catch (error) {
    console.error('💥 WordPress test error:', error);
    return NextResponse.json(
      {
        error: 'WordPress test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}