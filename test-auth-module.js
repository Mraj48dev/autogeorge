/**
 * Simple test script per verificare l'Auth Module
 */

async function testAuthModule() {
  try {
    console.log('🧪 Testing Auth Module Implementation...\n');

    // Test 1: Check available roles
    console.log('📋 Test 1: Available Roles');
    const response1 = await fetch('http://localhost:3000/api/admin/auth?action=roles');
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ Roles API works:', data1.data.roles);
    } else {
      console.log('❌ Roles API failed:', response1.status);
    }

    // Test 2: Check available permissions
    console.log('\n🔐 Test 2: Available Permissions');
    const response2 = await fetch('http://localhost:3000/api/admin/auth?action=permissions');
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('✅ Permissions API works. Found', data2.data.permissions.length, 'permissions');
    } else {
      console.log('❌ Permissions API failed:', response2.status);
    }

    // Test 3: Health check
    console.log('\n❤️ Test 3: Health Check');
    const response3 = await fetch('http://localhost:3000/api/admin/auth?action=health');
    if (response3.ok) {
      const data3 = await response3.json();
      console.log('✅ Health check works:', data3.data.status);
    } else {
      console.log('❌ Health check failed:', response3.status);
    }

    // Test 4: Create a test user
    console.log('\n👤 Test 4: Create Test User');
    const createUserResponse = await fetch('http://localhost:3000/api/admin/auth/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@autogeorge.com',
        name: 'Test User',
        role: 'editor'
      })
    });

    if (createUserResponse.ok) {
      const userData = await createUserResponse.json();
      console.log('✅ User creation works. User ID:', userData.data.user.id);
      console.log('✅ User role:', userData.data.user.role);
      console.log('✅ User permissions:', userData.data.user.permissions.length, 'permissions');

      // Test 5: Validate user permissions
      console.log('\n🔍 Test 5: Validate User Permissions');
      const validateResponse = await fetch('http://localhost:3000/api/admin/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.data.user.id,
          requiredPermissions: ['content:create', 'content:read'],
          requireAll: true
        })
      });

      if (validateResponse.ok) {
        const validateData = await validateResponse.json();
        console.log('✅ Permission validation works. Has access:', validateData.data.hasAccess);
      } else {
        console.log('❌ Permission validation failed:', validateResponse.status);
      }

    } else {
      console.log('❌ User creation failed:', createUserResponse.status);
      const errorData = await createUserResponse.text();
      console.log('Error details:', errorData);
    }

    console.log('\n🎉 Auth Module test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Eseguire il test solo se chiamato direttamente
if (typeof window === 'undefined') {
  testAuthModule();
}

module.exports = { testAuthModule };