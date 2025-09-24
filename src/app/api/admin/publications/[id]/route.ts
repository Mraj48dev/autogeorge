import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';
import { PrismaPublicationRepository } from '@/modules/publishing/infrastructure/repositories/PrismaPublicationRepository';
import { PublicationId } from '@/modules/publishing/domain/value-objects/PublicationId';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Gets a specific publication by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Publication ID is required' },
        { status: 400 }
      );
    }

    const publication = await prisma.publication.findUnique({
      where: { id }
    });

    if (!publication) {
      return NextResponse.json(
        { error: 'Publication not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: publication
    });

  } catch (error) {
    console.error('Error getting publication:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Updates a publication (e.g., retry, cancel)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Publication ID is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const publication = await prisma.publication.findUnique({
      where: { id }
    });

    if (!publication) {
      return NextResponse.json(
        { error: 'Publication not found' },
        { status: 404 }
      );
    }

    let updatedPublication;

    switch (action) {
      case 'retry':
        if (publication.status !== 'failed') {
          return NextResponse.json(
            { error: 'Can only retry failed publications' },
            { status: 400 }
          );
        }

        if (publication.retryCount >= publication.maxRetries) {
          return NextResponse.json(
            { error: 'Maximum retry attempts exceeded' },
            { status: 400 }
          );
        }

        updatedPublication = await prisma.publication.update({
          where: { id },
          data: {
            status: 'pending',
            retryCount: publication.retryCount + 1,
            startedAt: null,
            completedAt: null,
            error: null,
            updatedAt: new Date()
          }
        });
        break;

      case 'cancel':
        if (['completed', 'cancelled'].includes(publication.status)) {
          return NextResponse.json(
            { error: 'Cannot cancel completed or already cancelled publications' },
            { status: 400 }
          );
        }

        updatedPublication = await prisma.publication.update({
          where: { id },
          data: {
            status: 'cancelled',
            updatedAt: new Date()
          }
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: updatedPublication,
      message: `Publication ${action}ed successfully`
    });

  } catch (error) {
    console.error('Error updating publication:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Deletes a publication
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Publication ID is required' },
        { status: 400 }
      );
    }

    const publication = await prisma.publication.findUnique({
      where: { id }
    });

    if (!publication) {
      return NextResponse.json(
        { error: 'Publication not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of cancelled or failed publications
    if (!['cancelled', 'failed'].includes(publication.status)) {
      return NextResponse.json(
        { error: 'Can only delete cancelled or failed publications' },
        { status: 400 }
      );
    }

    await prisma.publication.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Publication deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting publication:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}