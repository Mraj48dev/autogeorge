'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export interface UseAuthorizationOptions {
  permission?: string;
  resourceId?: string;
  organizationId?: string;
  enabled?: boolean;
}

export interface UseAuthorizationResult {
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
  checkPermission: (permission: string, resourceId?: string, organizationId?: string) => Promise<boolean>;
}

/**
 * React hook for checking user permissions in frontend components.
 *
 * This hook maintains module separation by calling the backend API
 * instead of directly importing user-management module code.
 */
export function useAuthorization(options: UseAuthorizationOptions = {}): UseAuthorizationResult {
  const { userId, isSignedIn } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPermission = async (
    permission: string,
    resourceId?: string,
    organizationId?: string
  ): Promise<boolean> => {
    if (!isSignedIn || !userId) {
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Call the authorization API endpoint (maintains module separation)
      const response = await fetch('/api/auth/check-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permission,
          resourceId,
          organizationId,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication required');
          return false;
        }
        if (response.status === 403) {
          setError('Insufficient permissions');
          return false;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.hasPermission === true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Permission check failed:', errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-check permission when options change
  useEffect(() => {
    if (options.enabled !== false && options.permission && isSignedIn && userId) {
      checkPermission(options.permission, options.resourceId, options.organizationId)
        .then(setHasPermission)
        .catch(() => setHasPermission(false));
    } else {
      setHasPermission(false);
      setError(null);
    }
  }, [
    options.permission,
    options.resourceId,
    options.organizationId,
    options.enabled,
    isSignedIn,
    userId,
  ]);

  return {
    hasPermission,
    isLoading,
    error,
    checkPermission,
  };
}

/**
 * Specialized hooks for common permission patterns
 */
export function useAdminAccess() {
  return useAuthorization({ permission: 'admin:access' });
}

export function useContentPermissions() {
  const canCreate = useAuthorization({ permission: 'content:create' });
  const canEdit = useAuthorization({ permission: 'content:edit' });
  const canView = useAuthorization({ permission: 'content:view' });
  const canDelete = useAuthorization({ permission: 'content:delete' });
  const canPublish = useAuthorization({ permission: 'content:publish' });

  return {
    canCreate: canCreate.hasPermission,
    canEdit: canEdit.hasPermission,
    canView: canView.hasPermission,
    canDelete: canDelete.hasPermission,
    canPublish: canPublish.hasPermission,
    isLoading: canCreate.isLoading || canEdit.isLoading || canView.isLoading || canDelete.isLoading || canPublish.isLoading,
    error: canCreate.error || canEdit.error || canView.error || canDelete.error || canPublish.error,
  };
}

export function useSourcesPermissions() {
  const canManage = useAuthorization({ permission: 'sources:manage' });
  const canView = useAuthorization({ permission: 'sources:view' });

  return {
    canManage: canManage.hasPermission,
    canView: canView.hasPermission,
    isLoading: canManage.isLoading || canView.isLoading,
    error: canManage.error || canView.error,
  };
}

export function useUsersPermissions() {
  const canManage = useAuthorization({ permission: 'users:manage' });
  const canView = useAuthorization({ permission: 'users:view' });

  return {
    canManage: canManage.hasPermission,
    canView: canView.hasPermission,
    isLoading: canManage.isLoading || canView.isLoading,
    error: canManage.error || canView.error,
  };
}

/**
 * Hook to get current user role information
 */
export function useUserRole() {
  const { userId, isSignedIn } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !userId) {
      setRole(null);
      return;
    }

    const fetchUserRole = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/auth/user-role', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setRole(result.role);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Failed to fetch user role:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [isSignedIn, userId]);

  return {
    role,
    isLoading,
    error,
  };
}