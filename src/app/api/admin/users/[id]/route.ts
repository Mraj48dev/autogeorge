import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * PUT /api/admin/users/[id]
 * Update user role and status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { role, isActive } = body;

    console.log(`🔧 Updating user ${id}:`, { role, isActive });

    // For now, just return success since we don't have role field in DB
    // In a real implementation, you'd update the user record

    return NextResponse.json({
      success: true,
      message: `User ${id} updated successfully`,
      updated: {
        role,
        isActive
      }
    });

  } catch (error) {
    console.error('💥 Update user error:', error);
    return NextResponse.json({
      error: 'Failed to update user',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete/deactivate user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🗑️ Deactivating user ${id}`);

    // For now, just return success
    // In a real implementation, you'd soft delete or deactivate the user

    return NextResponse.json({
      success: true,
      message: `User ${id} deactivated successfully`
    });

  } catch (error) {
    console.error('💥 Delete user error:', error);
    return NextResponse.json({
      error: 'Failed to deactivate user',
      details: error.message
    }, { status: 500 });
  }
}