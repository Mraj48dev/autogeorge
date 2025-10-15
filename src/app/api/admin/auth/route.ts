import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/composition-root/container';

/**
 * GET /api/admin/auth
 * Gets authentication statistics and system status
 */
export async function GET(request: NextRequest) {
  try {
    const container = createContainer();
    const authAdminFacade = container.authAdminFacade;

    const { searchParams } = new URL(request.url);

    // Handle different query parameters
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        // Get authentication statistics
        const statsResult = await authAdminFacade.getAuthStats();

        if (statsResult.isFailure()) {
          return NextResponse.json(
            { error: 'Failed to get auth stats', details: statsResult.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: statsResult.value,
        });

      case 'roles':
        // Get available roles
        const roles = authAdminFacade.getAvailableRoles();
        return NextResponse.json({
          success: true,
          data: { roles },
        });

      case 'permissions':
        // Get available permissions
        const permissions = authAdminFacade.getAvailablePermissions();
        return NextResponse.json({
          success: true,
          data: { permissions },
        });

      case 'health':
        // Health check
        const health = await authAdminFacade.healthCheck();
        return NextResponse.json({
          success: true,
          data: health,
        });

      default:
        // Default: return basic auth module info
        return NextResponse.json({
          success: true,
          data: {
            module: 'auth',
            version: '1.0.0',
            status: 'operational',
            endpoints: [
              'GET /api/admin/auth?action=stats',
              'GET /api/admin/auth?action=roles',
              'GET /api/admin/auth?action=permissions',
              'GET /api/admin/auth?action=health',
              'GET /api/admin/auth/users',
              'POST /api/admin/auth/users',
              'PATCH /api/admin/auth/users/[id]/role',
              'POST /api/admin/auth/users/[id]/permissions',
              'DELETE /api/admin/auth/users/[id]/permissions',
              'POST /api/admin/auth/validate',
            ],
          },
        });
    }
  } catch (error) {
    console.error('Auth admin API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}