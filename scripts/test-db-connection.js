const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Testing database connection...');
    console.log('📍 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');

    // Test query
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
    console.log('✅ Query test successful:', result);

    // Check if tables exist
    try {
      const sourceCount = await prisma.source.count();
      console.log('✅ Sources table exists. Count:', sourceCount);
    } catch (error) {
      console.log('❌ Sources table missing:', error.message);
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('🔍 Error details:', {
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();