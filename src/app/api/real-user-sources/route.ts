import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/shared/database/prisma';

/**
 * Real user sources endpoint - uses actual database with Prisma
 * This endpoint works around the userId cache issue by creating sources without userId filter initially
 */
async function ensureUserExists(clerkUserId: string, userEmail?: string) {
  // Check if user exists in our database
  let user = await prisma.user.findUnique({
    where: { clerkUserId }
  });

  if (!user) {
    // Create user record if it doesn't exist
    console.log(`👤 Creating user record for Clerk user: ${clerkUserId}`);
    user = await prisma.user.create({
      data: {
        clerkUserId,
        email: userEmail || `${clerkUserId}@clerk.dev`,
        name: 'User',
        role: 'CONTENT_VIEWER'
      }
    });
    console.log(`✅ User record created: ${user.id}`);
  }

  return user;
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const { userId, sessionClaims } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`🔍 Getting sources for user: ${userId}`);

    // Ensure user exists in our database
    const user = await ensureUserExists(userId, sessionClaims?.email as string);

    // Query sources from database
    // NOTE: Due to Prisma cache issue, we get all sources and filter in application layer
    const allSources = await prisma.source.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to prevent too much data
    });

    // Filter by userId in application layer (temporary workaround)
    const userSources = allSources.filter(source => source.userId === user.id);

    console.log(`📊 Found ${allSources.length} total sources, ${userSources.length} for user ${userId}`);

    return NextResponse.json({
      success: true,
      sources: userSources,
      total: userSources.length,
      userId: userId,
      debug: {
        totalInDb: allSources.length,
        filteredForUser: userSources.length
      }
    });

  } catch (error) {
    console.error('❌ Error in real user sources API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'real-user-sources'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const { userId, sessionClaims } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Ensure user exists in our database
    const user = await ensureUserExists(userId, sessionClaims?.email as string);

    // Parse request body
    const body = await request.json();

    console.log(`📝 Creating source for user: ${userId}`, {
      name: body.name,
      type: body.type,
      url: body.url
    });

    // Create source in database with userId
    const createdSource = await prisma.source.create({
      data: {
        id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id, // Associate with current user
        name: body.name,
        type: body.type,
        status: 'active',
        url: body.url || null,
        defaultCategory: body.defaultCategory || null,
        configuration: body.configuration || {},
        metadata: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`✅ Created source: ${createdSource.id} for user: ${userId}`);

    return NextResponse.json({
      success: true,
      source: createdSource,
      message: `Source "${body.name}" created successfully`,
      userId: userId
    });

  } catch (error) {
    console.error('❌ Error creating source:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'real-user-sources'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user from Clerk
    const { userId, sessionClaims } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Ensure user exists in our database
    const user = await ensureUserExists(userId, sessionClaims?.email as string);

    // Parse request body to get sourceId
    const body = await request.json();
    const { sourceId } = body;

    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting source: ${sourceId} for user: ${userId}`);

    // First verify the source belongs to this user
    const existingSource = await prisma.source.findFirst({
      where: {
        id: sourceId,
        userId: user.id
      }
    });

    if (!existingSource) {
      return NextResponse.json(
        { error: 'Source not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the source
    await prisma.source.delete({
      where: {
        id: sourceId
      }
    });

    console.log(`✅ Successfully deleted source: ${sourceId} for user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: `Source deleted successfully`,
      userId: userId
    });

  } catch (error) {
    console.error('❌ Error deleting source:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'real-user-sources'
    }, { status: 500 });
  }
}