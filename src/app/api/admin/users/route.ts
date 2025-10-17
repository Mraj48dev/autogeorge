import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/users
 * Lista tutti gli utenti - MOCK DATA per demo
 * Protected via frontend auth check only
 */
export async function GET(request: NextRequest) {
  try {
    // Return mock data - no server-side auth for now to avoid issues
    const mockUsers = [
      {
        id: 'current-user',
        email: 'mraj48bis@gmail.com',
        role: 'SUPER_ADMIN',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'demo-user-1',
        email: 'editor@example.com',
        role: 'CONTENT_EDITOR',
        isActive: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'demo-user-2',
        email: 'viewer@example.com',
        role: 'CONTENT_VIEWER',
        isActive: false,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString()
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
}