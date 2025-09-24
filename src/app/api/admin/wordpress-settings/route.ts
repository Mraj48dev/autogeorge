import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const wordPressSite = await prisma.wordPressSite.findUnique({
      where: { userId }
    });

    return NextResponse.json({
      success: true,
      data: {
        site: wordPressSite
      }
    });
  } catch (error) {
    console.error('Error loading WordPress settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const {
      name,
      url,
      username,
      password,
      defaultCategory,
      defaultStatus,
      defaultAuthor,
      enableAutoPublish,
      enableFeaturedImage,
      enableTags,
      enableCategories,
      customFields,
      isActive
    } = body;

    // Validate required fields
    if (!name || !url || !username || !password) {
      return NextResponse.json(
        { error: 'Nome, URL, username e password sono obbligatori' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'URL non valido' },
        { status: 400 }
      );
    }

    const wordPressSite = await prisma.wordPressSite.upsert({
      where: { userId },
      update: {
        name,
        url,
        username,
        password,
        defaultCategory,
        defaultStatus: defaultStatus || 'draft',
        defaultAuthor,
        enableAutoPublish: enableAutoPublish || false,
        enableFeaturedImage: enableFeaturedImage !== false,
        enableTags: enableTags !== false,
        enableCategories: enableCategories !== false,
        customFields,
        isActive: isActive !== false,
        updatedAt: new Date()
      },
      create: {
        userId,
        name,
        url,
        username,
        password,
        defaultCategory,
        defaultStatus: defaultStatus || 'draft',
        defaultAuthor,
        enableAutoPublish: enableAutoPublish || false,
        enableFeaturedImage: enableFeaturedImage !== false,
        enableTags: enableTags !== false,
        enableCategories: enableCategories !== false,
        customFields,
        isActive: isActive !== false
      }
    });

    return NextResponse.json({
      success: true,
      data: { site: wordPressSite }
    });
  } catch (error) {
    console.error('Error saving WordPress settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    await prisma.wordPressSite.delete({
      where: { userId }
    });

    return NextResponse.json({
      success: true,
      message: 'Configurazione WordPress eliminata con successo'
    });
  } catch (error) {
    console.error('Error deleting WordPress settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}