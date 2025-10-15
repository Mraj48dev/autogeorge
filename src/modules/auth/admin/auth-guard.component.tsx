'use client';

import { ReactNode, useEffect, useState } from 'react';
import { UserEntity, UserRole, AuthenticationError, AuthorizationError } from '../domain';
import { getContainer } from '../../../composition-root/container';

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  fallback?: ReactNode;
  redirectTo?: string;
}

interface AuthGuardState {
  isLoading: boolean;
  user: UserEntity | null;
  error: string | null;
}

/**
 * AuthGuard component protects routes and components based on authentication and roles
 *
 * Usage:
 * <AuthGuard>
 *   <ProtectedContent />
 * </AuthGuard>
 *
 * <AuthGuard requiredRole={UserRole.ADMIN}>
 *   <AdminContent />
 * </AuthGuard>
 */
export function AuthGuard({
  children,
  requiredRole,
  fallback,
  redirectTo = '/sign-in'
}: AuthGuardProps) {
  const [state, setState] = useState<AuthGuardState>({
    isLoading: true,
    user: null,
    error: null
  });

  useEffect(() => {
    checkAuthentication();
  }, [requiredRole]);

  const checkAuthentication = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const container = getContainer();
      const authService = container.authService;

      if (requiredRole) {
        // Check specific role requirement
        const user = await authService.requireRole(requiredRole);
        setState({ isLoading: false, user, error: null });
      } else {
        // Just check authentication
        const user = await authService.requireAuthentication();
        setState({ isLoading: false, user, error: null });
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        setState({
          isLoading: false,
          user: null,
          error: 'Authentication required'
        });

        // Redirect to sign-in page
        if (typeof window !== 'undefined') {
          window.location.href = redirectTo;
        }
      } else if (error instanceof AuthorizationError) {
        setState({
          isLoading: false,
          user: null,
          error: 'Insufficient permissions'
        });
      } else {
        setState({
          isLoading: false,
          user: null,
          error: 'Authentication error'
        });
      }
    }
  };

  // Loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Checking authentication...</span>
      </div>
    );
  }

  // Error state (unauthorized)
  if (state.error) {
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
          <p className="text-gray-600 mb-4">{state.error}</p>
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

  // Authenticated - render protected content
  return <>{children}</>;
}

/**
 * Hook to get current authenticated user
 */
export function useAuthUser() {
  const [user, setUser] = useState<UserEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const container = getContainer();
        const authService = container.authService;
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();
  }, []);

  return { user, isLoading };
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