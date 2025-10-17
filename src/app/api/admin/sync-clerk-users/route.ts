import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * POST /api/admin/sync-clerk-users
 * Synchronize users from Clerk to our database
 * Updated to ensure Vercel deployment
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting Clerk users synchronization...');

    // Fetch all users from Clerk
    const clerkUsers = await clerkClient.users.getUserList();

    console.log(`📊 Found ${clerkUsers.length} users in Clerk`);

    const syncResults = [];

    for (const clerkUser of clerkUsers) {
      try {
        const email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;

        if (!email) {
          console.log(`⚠️ Skipping user ${clerkUser.id} - no email found`);
          continue;
        }

        console.log(`🔄 Processing user: ${email}`);

        // Check if user already exists in our database
        const existingUser = await prisma.$queryRaw`
          SELECT id, email FROM users WHERE email = ${email}
        `;

        if (Array.isArray(existingUser) && existingUser.length > 0) {
          console.log(`✅ User ${email} already exists in database`);
          syncResults.push({
            email,
            action: 'exists',
            clerkId: clerkUser.id
          });
        } else {
          // Insert new user using raw SQL to avoid schema issues
          await prisma.$executeRaw`
            INSERT INTO users (id, email, name, "createdAt", "updatedAt")
            VALUES (${clerkUser.id}, ${email}, ${clerkUser.firstName || ''} ${clerkUser.lastName || ''}, ${clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date()}, ${new Date()})
          `;

          console.log(`✅ Added new user: ${email}`);
          syncResults.push({
            email,
            action: 'added',
            clerkId: clerkUser.id
          });
        }

      } catch (userError) {
        console.error(`❌ Error processing user ${clerkUser.id}:`, userError);
        syncResults.push({
          email: clerkUser.emailAddresses[0]?.emailAddress || 'unknown',
          action: 'error',
          error: userError.message
        });
      }
    }

    // Get final count of users in database
    const finalCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`;

    return NextResponse.json({
      success: true,
      message: 'Clerk users synchronized successfully',
      results: syncResults,
      totalClerkUsers: clerkUsers.length,
      finalDatabaseCount: Array.isArray(finalCount) ? finalCount[0]?.count : 0,
      summary: {
        added: syncResults.filter(r => r.action === 'added').length,
        existing: syncResults.filter(r => r.action === 'exists').length,
        errors: syncResults.filter(r => r.action === 'error').length
      }
    });

  } catch (error) {
    console.error('💥 Sync Clerk users error:', error);
    return NextResponse.json({
      error: 'Failed to sync Clerk users',
      details: error.message
    }, { status: 500 });
  }
}