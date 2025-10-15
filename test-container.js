/**
 * Test diretto del container per Auth Module
 */

// Simula un test del container senza Next.js
async function testContainer() {
  try {
    console.log('🧪 Testing Auth Container directly...\n');

    // Test import del container
    const { createContainer } = await import('./src/composition-root/container.ts');
    console.log('✅ Container import successful');

    // Crea container
    const container = createContainer();
    console.log('✅ Container creation successful');

    // Test auth module
    const authFacade = container.authAdminFacade;
    console.log('✅ Auth facade accessible');

    // Test roles
    const roles = authFacade.getAvailableRoles();
    console.log('✅ Available roles:', roles);

    // Test permissions
    const permissions = authFacade.getAvailablePermissions();
    console.log('✅ Available permissions count:', permissions.length);

    // Test health
    const health = await authFacade.healthCheck();
    console.log('✅ Health check:', health.status);

    console.log('\n🎉 Container test passed!');

  } catch (error) {
    console.error('❌ Container test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testContainer();