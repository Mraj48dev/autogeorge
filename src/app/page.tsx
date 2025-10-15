'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';

export default function HomePage() {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  // User is authenticated - show authenticated homepage with user info
  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-6xl mx-auto">

            {/* Welcome Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🚀 Benvenuto in AutoGeorge
              </h1>
              <p className="text-gray-600 text-lg">
                Piattaforma di generazione automatica e pubblicazione di articoli
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">

              {/* User Information */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Il Tuo Profilo</h2>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4">
                      <UserButton />
                      <div>
                        <p className="font-medium">{user?.fullName || user?.firstName || 'Utente'}</p>
                        <p className="text-sm text-gray-600">{user?.primaryEmailAddress?.emailAddress}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Azioni Rapide</h2>

                <Card>
                  <CardHeader>
                    <CardTitle>Gestione Contenuti</CardTitle>
                    <CardDescription>
                      Accedi alle funzionalità principali della piattaforma
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/admin">
                      <Button className="w-full">
                        📊 Dashboard Admin
                      </Button>
                    </Link>
                    <Link href="/admin/sources">
                      <Button variant="outline" className="w-full">
                        📡 Gestione Fonti RSS
                      </Button>
                    </Link>
                    <Link href="/admin/articles">
                      <Button variant="outline" className="w-full">
                        📝 Articoli Generati
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sistema</CardTitle>
                    <CardDescription>
                      Monitoraggio e stato del sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/api/health" target="_blank">
                      <Button variant="outline" className="w-full">
                        ❤️ Health Check API
                      </Button>
                    </Link>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>🔐 Clerk Security Active</span>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>

            {/* System Status */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Sistema operativo</span>
                <Badge variant="outline">Auth Module attivo</Badge>
                <Badge variant="outline">Database connesso</Badge>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // User is not authenticated - show login options
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚀 AutoGeorge
          </h1>
          <p className="text-gray-600 text-lg">
            Automatizza la produzione di contenuti per il tuo blog
          </p>
          <p className="text-gray-500 mt-2">
            Generazione automatica e pubblicazione di articoli con Clean Architecture
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">

          {/* Authentication Options */}
          <Card>
            <CardHeader>
              <CardTitle>🔐 Accesso alla Piattaforma</CardTitle>
              <CardDescription>
                Scegli come accedere al tuo account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Clerk Auth */}
              <div>
                <h4 className="font-medium mb-3">🔐 Accesso Sicuro</h4>
                <div className="space-y-2">
                  <SignInButton mode="modal">
                    <Button className="w-full">
                      🔑 Accedi al Sistema
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button variant="outline" className="w-full">
                      ✨ Registrati Gratuitamente
                    </Button>
                  </SignUpButton>
                </div>
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-700">
                    🛡️ Sicurezza enterprise con Clerk.com
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Sistema di Ruoli</CardTitle>
              <CardDescription>
                Comprendi i permessi e le funzionalità disponibili
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Admin</span>
                    <Badge className="bg-red-100 text-red-800">admin</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Accesso completo al sistema e gestione utenti
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Editor</span>
                    <Badge className="bg-blue-100 text-blue-800">editor</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Creazione e gestione contenuti, fonti RSS
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Viewer</span>
                    <Badge className="bg-green-100 text-green-800">viewer</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Solo lettura (assegnato ai nuovi utenti)
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">API Client</span>
                    <Badge className="bg-yellow-100 text-yellow-800">api_client</Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Accesso programmatico alle API
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>Primo accesso:</strong> Riceverai automaticamente il ruolo "viewer".
                  Un amministratore può promuoverti successivamente.
                </p>
              </div>

            </CardContent>
          </Card>

        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 space-y-2">
          <p>Sistema implementato con Clean Architecture + RBAC</p>
          <div className="inline-flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Auth Module attivo</span>
            <span>•</span>
            <span>Database connesso</span>
            <span>•</span>
            <span>API funzionanti</span>
          </div>
        </div>

      </div>
    </div>
  );
}