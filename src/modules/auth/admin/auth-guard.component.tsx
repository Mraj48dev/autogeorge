'use client';

import { ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { UserEntity, UserRole } from '../domain';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * AuthGuard component protects routes and components based on authentication and roles
 * Uses Clerk hooks directly for real-time authentication state
 */
export function AuthGuard({
  children,
  requiredRole,
  fallback,
  redirectTo = '/sign-in'
}: AuthGuardProps) {
  const { user, isLoaded } = useUser();

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Checking authentication...</span>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Redirect to sign-in
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Authentication required</p>
          <button
            onClick={() => window.location.href = redirectTo}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Check role if required
  if (requiredRole) {
    const userRole = determineUserRole(user);
    const roleHierarchy = {
      [UserRole.VIEWER]: 0,
      [UserRole.EDITOR]: 1,
      [UserRole.ADMIN]: 2
    };

    const userLevel = roleHierarchy[userRole];
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">Insufficient permissions. Required: {requiredRole}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
  }

  // Authenticated and authorized - render protected content
  return <>{children}</>;
}

/**
 * Helper function to determine user role from Clerk user data
 */
function determineUserRole(clerkUser: any): UserRole {
  // Check public metadata first
  if (clerkUser.publicMetadata?.role) {
    const role = clerkUser.publicMetadata.role as string;
    if (Object.values(UserRole).includes(role as UserRole)) {
      return role as UserRole;
    }
  }

  // Check email patterns for admin
  const email = clerkUser.emailAddresses[0]?.emailAddress || '';
  if (email.endsWith('@autogeorge.dev') || email.includes('admin')) {
    return UserRole.ADMIN;
  }

  // Default role
  return UserRole.VIEWER;
}

/**
 * Hook to get current authenticated user using Clerk
 */
export function useAuthUser() {
  const { user: clerkUser, isLoaded } = useUser();

  const user: UserEntity | null = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || '',
    role: determineUserRole(clerkUser),
    name: clerkUser.firstName && clerkUser.lastName
      ? `${clerkUser.firstName} ${clerkUser.lastName}`
      : clerkUser.firstName || undefined,
    createdAt: new Date(clerkUser.createdAt),
    lastSignInAt: clerkUser.lastSignInAt ? new Date(clerkUser.lastSignInAt) : undefined,
    isActive: () => true,
    canEdit: () => {
      const role = determineUserRole(clerkUser);
      return role === UserRole.ADMIN || role === UserRole.EDITOR;
    },
    isAdmin: () => determineUserRole(clerkUser) === UserRole.ADMIN
  } as UserEntity : null;

  return { user, isLoading: !isLoaded };
}

/**
 * Helper component for role-based conditional rendering
 */
interface RoleGuardProps {
  requiredRole: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ requiredRole, children, fallback }: RoleGuardProps) {
  const { user, isLoading } = useAuthUser();

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
    );
  }

  if (!user || !user.canEdit()) {
    return fallback ? <>{fallback}</> : null;
  }

  // Check role hierarchy
  const roleHierarchy = {
    [UserRole.VIEWER]: 0,
    [UserRole.EDITOR]: 1,
    [UserRole.ADMIN]: 2
  };

  const userLevel = roleHierarchy[user.role];
  const requiredLevel = roleHierarchy[requiredRole];

  if (userLevel >= requiredLevel) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}