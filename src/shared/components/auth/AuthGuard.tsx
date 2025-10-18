'use client';

import React from 'react';
import { useAuth } from '@clerk/nextjs';
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
 * Simplified AuthGuard component that only checks Clerk authentication.
 * Complex permission system disabled for now.
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

  // Show loading state while authentication is loading
  if (!isLoaded) {
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

  // For now, all authenticated users have access
  // TODO: Implement proper permission system later

  // Render children if authenticated
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