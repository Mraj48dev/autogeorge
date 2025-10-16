import { NextRequest, NextResponse } from 'next/server';
import { createUserManagementContainer } from '@/composition-root/container';

/**
 * Test endpoint for User Management Module
 * GET /api/admin/user-management/test
 */
export async function GET(request: NextRequest) {
  try {
    const { userManagementFacade } = createUserManagementContainer();

    // Test health check
    const healthResult = await userManagementFacade.getHealth();

    if (healthResult.isFailure()) {
      return NextResponse.json(
        {
          error: 'User Management health check failed',
          details: healthResult.error
        },
        { status: 500 }
      );
    }

    // Test dry run
    const dryRunResult = await userManagementFacade.dryRun();

    if (dryRunResult.isFailure()) {
      return NextResponse.json(
        {
          error: 'User Management dry run failed',
          details: dryRunResult.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User Management Module is working!',
      health: healthResult.value,
      dryRun: dryRunResult.value,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('User Management test error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}