import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/users
 * Lista tutti gli utenti dal sistema auth esistente
 * Protected: Requires ADMIN role via AuthGuard on frontend
 */
const getUsersHandler = async (request: NextRequest) => {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // For now, return mock data to demonstrate the UI works
    // In a real implementation, you would fetch from your auth system
    const mockUsers = [
      {
        id: userId,
        email: 'mraj48bis@gmail.com',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    return NextResponse.json({
      success: true,
      users: mockUsers,
      pagination: {
        page: 1,
        limit: 20,
        total: mockUsers.length,
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
};

export const GET = getUsersHandler;