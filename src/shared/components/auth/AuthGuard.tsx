'use client';

import React from 'react';
import { useAuth } from '@clerk/nextjs';
import { useAuthorization } from '@/shared/hooks/useAuthorization';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

export interface AuthGuardProps {
  children: React.ReactNode;
  permission?: string;
  resourceId?: string;
  organizationId?: string;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

/**
 * AuthGuard component that conditionally renders content based on user permissions.
 *
 * This component maintains strict module separation by only using the shared
 * authorization hook, which internally communicates with user-management
 * through the DI container.
 */
export function AuthGuard({
  children,
  permission,
  resourceId,
  organizationId,
  fallback,
  requireAuth = true
}: AuthGuardProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const { hasPermission, isLoading, error } = useAuthorization({
    permission,
    resourceId,
    organizationId,
    enabled: isSignedIn && !!permission
  });

  // Show loading state while authentication/authorization is loading
  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isSignedIn) {
    return fallback || (
      <Alert>
        <AlertDescription>
          You must be signed in to access this content.
        </AlertDescription>
      </Alert>
    );
  }

  // Check permission requirement
  if (permission && !hasPermission) {
    return fallback || (
      <Alert>
        <AlertDescription>
          You don't have permission to access this content.
          {error && ` (${error})`}
        </AlertDescription>
      </Alert>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
}

/**
 * Higher-order component for protecting entire pages
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<AuthGuardProps, 'children'>
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...guardProps}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

/**
 * Specialized guard components for common use cases
 */
export const AdminGuard: React.FC<Omit<AuthGuardProps, 'permission'>> = (props) => (
  <AuthGuard {...props} requireAuth={true} />
);

export const ContentManagerGuard: React.FC<Omit<AuthGuardProps, 'permission'>> = (props) => (
  <AuthGuard {...props} permission="content:manage" />
);

export const ContentEditorGuard: React.FC<Omit<AuthGuardProps, 'permission'>> = (props) => (
  <AuthGuard {...props} permission="content:edit" />
);

export const ContentViewerGuard: React.FC<Omit<AuthGuardProps, 'permission'>> = (props) => (
  <AuthGuard {...props} permission="content:view" />
);

export const SourcesManagerGuard: React.FC<Omit<AuthGuardProps, 'permission'>> = (props) => (
  <AuthGuard {...props} permission="sources:manage" />
);

export const UsersManagerGuard: React.FC<Omit<AuthGuardProps, 'permission'>> = (props) => (
  <AuthGuard {...props} permission="users:manage" />
);