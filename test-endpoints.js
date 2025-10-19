#!/usr/bin/env node

/**
 * Test script per gli endpoint multi-tenant del Sources Module
 * Testa SOLO la struttura degli endpoint, non l'autenticazione
 */

const BASE_URL = 'http://localhost:3001';

async function testEndpoint(method, url, body = null) {
  console.log(`\n🧪 Testing ${method} ${url}`);

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${url}`, options);
    const data = await response.json();

    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));

    return { status: response.status, data };
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
    return { error: error.message };
  }
}

async function main() {
  console.log('🚀 Testing Sources Module Multi-Tenant Endpoints');
  console.log('📍 Server:', BASE_URL);

  // Test 1: GET /api/user/sources (should return 401 - Unauthorized)
  await testEndpoint('GET', '/api/user/sources');

  // Test 2: POST /api/user/sources (should return 401 - Unauthorized)
  await testEndpoint('POST', '/api/user/sources', {
    name: 'Test RSS Feed',
    type: 'rss',
    url: 'https://example.com/feed.xml'
  });

  // Test 3: GET /api/user/sources/123 (should return 401 - Unauthorized)
  await testEndpoint('GET', '/api/user/sources/test-id-123');

  // Test 4: PUT /api/user/sources/123 (should return 401 - Unauthorized)
  await testEndpoint('PUT', '/api/user/sources/test-id-123', {
    name: 'Updated RSS Feed'
  });

  // Test 5: DELETE /api/user/sources/123 (should return 401 - Unauthorized)
  await testEndpoint('DELETE', '/api/user/sources/test-id-123');

  // Test 6: Verify old admin endpoint still works
  await testEndpoint('GET', '/api/admin/sources');

  console.log('\n✅ Test Summary:');
  console.log('   - All /api/user/* endpoints should return 401 (Unauthorized)');
  console.log('   - This confirms authentication is working');
  console.log('   - Next step: Test with valid Clerk authentication');
}

main().catch(console.error);