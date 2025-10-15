'use client';

import { useSession } from 'next-auth/react';
import { UserInfo } from '@/components/auth/UserInfo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

/**
 * Authentication Demo Page
 * Shows Auth Module integration with frontend
 */
export default function AuthDemoPage() {
  const { data: session, status } = useSession();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔐 Auth Module Demo
          </h1>
          <p className="text-gray-600">
            Dimostrazione dell'integrazione tra Clean Architecture Auth Module e NextAuth.js
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">

          {/* User Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Informazioni Utente</h2>
            <UserInfo />

            {!session && (
              <div className="text-center">
                <Link href="/auth/signin">
                  <Button>Effettua l'accesso</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Technical Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Informazioni Tecniche</h2>

            <Card>
              <CardHeader>
                <CardTitle>Stato Sessione</CardTitle>
                <CardDescription>Stato attuale dell'autenticazione NextAuth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded">{status}</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Session ID:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {session?.user?.id || 'N/A'}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span>Enhanced:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded">
                      {session?.user?.role ? 'Sì' : 'No'}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Architettura</CardTitle>
                <CardDescription>Come funziona l'integrazione</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>1. NextAuth Callbacks</strong>
                    <p className="text-gray-600">
                      I callback di NextAuth chiamano il nostro <code>NextAuthAdapter</code>
                    </p>
                  </div>
                  <div>
                    <strong>2. Auth Module Integration</strong>
                    <p className="text-gray-600">
                      L'adapter usa i nostri Use Cases (<code>AuthenticateUser</code>, <code>GetUser</code>)
                    </p>
                  </div>
                  <div>
                    <strong>3. Domain Enhancement</strong>
                    <p className="text-gray-600">
                      La sessione viene arricchita con ruoli e permessi dal nostro Domain
                    </p>
                  </div>
                  <div>
                    <strong>4. Clean Architecture</strong>
                    <p className="text-gray-600">
                      Totale separazione tra logica di dominio e framework di autenticazione
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Session Raw Data (for debugging) */}
        {session && (
          <Card>
            <CardHeader>
              <CardTitle>Dati Sessione Raw (Debug)</CardTitle>
              <CardDescription>
                Dati completi della sessione per debugging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* API Testing */}
        <Card>
          <CardHeader>
            <CardTitle>🧪 Test API Auth Module</CardTitle>
            <CardDescription>
              Testa gli endpoint del nostro Auth Module
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/api/admin/auth" target="_blank">
                <Button variant="outline" className="w-full">
                  GET /api/admin/auth
                </Button>
              </Link>
              <Link href="/api/admin/auth/users" target="_blank">
                <Button variant="outline" className="w-full">
                  GET /api/admin/auth/users
                </Button>
              </Link>
            </div>

            <div className="text-sm text-gray-600">
              <p><strong>Note:</strong> Questi endpoint richiedono permessi amministrativi.</p>
              <p>Se sei un nuovo utente (ruolo viewer), non avrai accesso.</p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="text-center space-x-4">
          <Link href="/">
            <Button variant="outline">← Torna alla Home</Button>
          </Link>
          <Link href="/admin">
            <Button>Vai al Dashboard Admin</Button>
          </Link>
        </div>

      </div>
    </div>
  );
}