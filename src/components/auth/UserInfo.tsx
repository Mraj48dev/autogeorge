'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

/**
 * User Information Component
 * Shows current user data enhanced by our Auth Module
 */
export function UserInfo() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-200 h-12 w-12"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session?.user) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Non autenticato</CardTitle>
          <CardDescription>Effettua l'accesso per vedere le tue informazioni</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const user = session.user as any; // Enhanced by our Auth Module

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'editor':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-green-100 text-green-800';
      case 'api_client':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Accesso completo al sistema';
      case 'editor':
        return 'Creazione e gestione contenuti';
      case 'viewer':
        return 'Solo lettura';
      case 'api_client':
        return 'Accesso programmatico';
      default:
        return 'Ruolo non riconosciuto';
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={user.image} alt={user.name || user.email} />
            <AvatarFallback>
              {(user.name || user.email)?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{user.name || 'Utente'}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Ruolo:</span>
            <Badge className={getRoleColor(user.role)}>
              {user.role || 'viewer'}
            </Badge>
          </div>
          <p className="text-xs text-gray-600">
            {getRoleDescription(user.role || 'viewer')}
          </p>
        </div>

        <Separator />

        <div>
          <span className="text-sm font-medium mb-2 block">Permessi:</span>
          <div className="flex flex-wrap gap-1">
            {user.permissions && user.permissions.length > 0 ? (
              user.permissions.slice(0, 3).map((permission: string) => (
                <Badge key={permission} variant="outline" className="text-xs">
                  {permission}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-gray-500">Nessun permesso specifico</span>
            )}
            {user.permissions && user.permissions.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{user.permissions.length - 3} altri
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Stato:</span>
            <span className={user.isActive ? 'text-green-600' : 'text-red-600'}>
              {user.isActive ? 'Attivo' : 'Disattivato'}
            </span>
          </div>

          {user.emailVerified && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Email verificata:</span>
              <span className="text-green-600">Sì</span>
            </div>
          )}

          {user.lastLoginAt && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Ultimo accesso:</span>
              <span>{new Date(user.lastLoginAt).toLocaleDateString('it-IT')}</span>
            </div>
          )}
        </div>

        <Separator />

        <Button
          onClick={() => signOut({ callbackUrl: '/' })}
          variant="outline"
          className="w-full"
        >
          Disconnetti
        </Button>
      </CardContent>
    </Card>
  );
}