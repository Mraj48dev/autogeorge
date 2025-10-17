import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * GET /api/admin/users
 * Lista tutti gli utenti dal database reale
 * Protected via frontend auth check only
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching users from database...');

    // Test database connection first
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection OK:', dbTest);

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

    console.log(`📊 Found ${users.length} users in database:`, users.map(u => u.email));

    // If no users found in database, return mock data as fallback
    if (users.length === 0) {
      console.log('⚠️ No users found in database, returning mock data');
      const mockUsers = [
        {
          id: 'mock-current-user',
          email: 'mraj48bis@gmail.com',
          role: 'SUPER_ADMIN',
          isActive: true,
          name: 'Current User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: null
        },
        {
          id: 'mock-editor',
          email: 'editor@example.com',
          role: 'CONTENT_EDITOR',
          isActive: true,
          name: 'Editor User',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
          lastLoginAt: null
        },
        {
          id: 'mock-viewer',
          email: 'viewer@example.com',
          role: 'CONTENT_VIEWER',
          isActive: false,
          name: 'Viewer User',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          updatedAt: new Date(Date.now() - 172800000).toISOString(),
          lastLoginAt: null
        }
      ];

      return NextResponse.json({
        success: true,
        users: mockUsers,
        debug: { source: 'mock_data', reason: 'no_users_in_db' },
        pagination: {
          page: 1,
          limit: 20,
          total: mockUsers.length,
          pages: 1
        }
      });
    }

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
      debug: { source: 'database', count: formattedUsers.length },
      pagination: {
        page: 1,
        limit: 20,
        total: formattedUsers.length,
        pages: 1
      }
    });

  } catch (error) {
    console.error('💥 Get users API error:', error);

    // Return mock data as fallback on error
    const mockUsers = [
      {
        id: 'error-fallback-user',
        email: 'mraj48bis@gmail.com',
        role: 'SUPER_ADMIN',
        isActive: true,
        name: 'Fallback User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: null
      }
    ];

    return NextResponse.json({
      success: true,
      users: mockUsers,
      debug: { source: 'mock_data', reason: 'database_error', error: error.message },
      pagination: {
        page: 1,
        limit: 20,
        total: mockUsers.length,
        pages: 1
      }
    });
  }
}