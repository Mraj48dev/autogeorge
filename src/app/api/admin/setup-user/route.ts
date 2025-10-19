import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/shared/database/prisma';

/**
 * Setup user endpoint - Creates user in database if doesn't exist
 * Call this after first Clerk login to ensure user exists in our DB
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setting up user...');

    // Get Clerk authentication
    const { userId: clerkUserId, user } = await auth();
    console.log('🔑 Clerk data:', { clerkUserId, userEmail: user?.primaryEmailAddress?.emailAddress });

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkUserId }
    });

    if (existingUser) {
      console.log('✅ User already exists:', existingUser.id);
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        user: {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.role
        }
      });
    }

    // Create new user
    const email = user?.primaryEmailAddress?.emailAddress || 'user@example.com';
    const newUser = await prisma.user.create({
      data: {
        clerkUserId,
        email,
        role: 'CONTENT_MANAGER',
        isActive: true
      }
    });

    console.log('✅ User created:', newUser.id);

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Setup user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}