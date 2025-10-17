import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/users
 * Lista tutti gli utenti dal database reale
 * Protected via frontend auth check only
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch real users from database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        name: true,
        lastLoginAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Map database users to frontend format
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString()
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page: 1,
        limit: 20,
        total: formattedUsers.length,
        pages: 1
      }
    });

  } catch (error) {
    console.error('Get users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}