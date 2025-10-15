'use client';

import { useUser, UserButton } from '@clerk/nextjs';
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
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
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

  if (!user) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Non autenticato</CardTitle>
          <CardDescription>Effettua l'accesso per vedere le tue informazioni</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // user is already from Clerk

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
            <AvatarImage src={user.imageUrl} alt={user.fullName || user.primaryEmailAddress?.emailAddress} />
            <AvatarFallback>
              {(user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress)?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{user.fullName || user.firstName || 'Utente'}</CardTitle>
            <CardDescription>{user.primaryEmailAddress?.emailAddress}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Stato:</span>
            <span className="text-green-600">Attivo</span>
          </div>

          <div className="flex justify-between text-xs text-gray-600">
            <span>Email verificata:</span>
            <span className="text-green-600">Sì</span>
          </div>

          <div className="flex justify-between text-xs text-gray-600">
            <span>Account:</span>
            <span>Clerk Enterprise</span>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-center">
          <UserButton />
        </div>
      </CardContent>
    </Card>
  );
}