/**
 * Multi-Tenant Authentication Utilities
 *
 * Provides authentication and authorization utilities for multi-tenant API endpoints.
 * Integrates with existing auth module while adding multi-tenant capabilities.
 */

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/shared/database/prisma';

export interface AuthContext {
  userId: string;
  email?: string;
  clerkUserId?: string;
  role?: string;
}

/**
 * Extract current user from request
 * Integrates with existing Clerk authentication
 */
export async function getCurrentUser(request: NextRequest): Promise<AuthContext | null> {
  try {
    console.log('🔍 getCurrentUser - Getting Clerk auth...');

    // Get Clerk authentication
    const { userId: clerkUserId } = await auth();
    console.log('🔑 Clerk response:', { clerkUserId });

    if (!clerkUserId) {
      console.log('❌ No Clerk user ID found');
      return null;
    }

    // Find user in our database by Clerk ID
    console.log('🔍 Looking up user in database...');
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        email: true,
        clerkUserId: true,
        role: true,
        isActive: true
      }
    });

    console.log('👤 Database user lookup result:', { user, isActive: user?.isActive });

    if (!user || !user.isActive) {
      console.log('❌ User not found or inactive');
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      clerkUserId: user.clerkUserId || undefined,
      role: user.role
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Require authentication - throws if user not found
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const user = await getCurrentUser(request);

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Verify that a resource belongs to the current user
 */
export async function verifyResourceOwnership(
  userId: string,
  resourceType: 'source' | 'site' | 'article' | 'publication' | 'featuredImage' | 'imagePrompt',
  resourceId: string
): Promise<boolean> {
  try {
    switch (resourceType) {
      case 'source':
        const source = await prisma.source.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return source?.userId === userId;

      case 'site':
        const site = await prisma.wordPressSite.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return site?.userId === userId;

      case 'article':
        const article = await prisma.article.findUnique({
          where: { id: resourceId },
          include: { source: { select: { userId: true } } }
        });
        return article?.source?.userId === userId;

      case 'publication':
        const publication = await prisma.publication.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return publication?.userId === userId;

      case 'featuredImage':
        const featuredImage = await prisma.featuredImage.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return featuredImage?.userId === userId;

      case 'imagePrompt':
        const imagePrompt = await prisma.imagePrompt.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return imagePrompt?.userId === userId;

      default:
        return false;
    }
  } catch (error) {
    console.error(`Error verifying ${resourceType} ownership:`, error);
    return false;
  }
}

/**
 * Get user's WordPress sites
 */
export async function getUserSites(userId: string) {
  return prisma.wordPressSite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Verify site ownership and get site details
 */
export async function getUserSite(userId: string, siteId: string) {
  return prisma.wordPressSite.findUnique({
    where: {
      id: siteId,
      userId
    }
  });
}

/**
 * Multi-tenant query helpers
 */
export const multiTenantQueries = {
  /**
   * Get user's sources with optional site filtering
   */
  getUserSources: (userId: string, siteId?: string) => {
    const where: any = { userId };

    // Note: Sources aren't directly linked to sites yet,
    // but we maintain the interface for future enhancement
    return prisma.source.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Get user's articles with optional filtering
   */
  getUserArticles: (userId: string, options?: {
    sourceId?: string;
    siteId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) => {
    const where: any = {
      source: { userId }
    };

    if (options?.sourceId) {
      where.sourceId = options.sourceId;
    }

    if (options?.siteId) {
      where.wordpressSiteId = options.siteId;
    }

    if (options?.status) {
      where.status = options.status;
    }

    return prisma.article.findMany({
      where,
      include: {
        source: true,
        wordpressSite: true
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
      skip: options?.offset
    });
  },

  /**
   * Get user's feed items
   */
  getUserFeedItems: (userId: string, sourceId?: string) => {
    const where: any = {
      source: { userId }
    };

    if (sourceId) {
      where.sourceId = sourceId;
    }

    return prisma.feedItem.findMany({
      where,
      include: { source: true },
      orderBy: { publishedAt: 'desc' }
    });
  }
};

/**
 * Permission checking utilities
 */
export const permissions = {
  /**
   * Check if user can manage sources
   */
  canManageSources: (user: AuthContext): boolean => {
    return ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'CONTENT_MANAGER'].includes(user.role || '');
  },

  /**
   * Check if user can manage articles
   */
  canManageArticles: (user: AuthContext): boolean => {
    return ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'CONTENT_MANAGER', 'CONTENT_EDITOR'].includes(user.role || '');
  },

  /**
   * Check if user can view content
   */
  canViewContent: (user: AuthContext): boolean => {
    return ['SUPER_ADMIN', 'ORGANIZATION_ADMIN', 'CONTENT_MANAGER', 'CONTENT_EDITOR', 'CONTENT_VIEWER'].includes(user.role || '');
  }
};