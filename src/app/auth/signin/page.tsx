'use client';

import { signIn, getProviders } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Provider {
  id: string;
  name: string;
  type: string;
}

/**
 * Custom Sign-In page that shows role information
 * Integrates with our Auth Module to explain user roles
 */
export default function SignInPage() {
  const [providers, setProviders] = useState<Record<string, Provider>>({});
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadProviders = async () => {
      const providersData = await getProviders();
      setProviders(providersData || {});
    };
    loadProviders();
  }, []);

  const handleSignIn = async (providerId: string) => {
    setLoading(providerId);
    try {
      await signIn(providerId, { callbackUrl: '/' });
    } catch (error) {
      console.error('Sign-in error:', error);
    } finally {
      setLoading(null);
    }
  };

  const roleInfo = [
    {
      name: 'Admin',
      badge: 'admin',
      description: 'Accesso completo al sistema',
      permissions: ['Gestione utenti', 'Configurazione sistema', 'Tutte le funzioni'],
      color: 'bg-red-100 text-red-800',
    },
    {
      name: 'Editor',
      badge: 'editor',
      description: 'Creazione e gestione contenuti',
      permissions: ['Creare fonti RSS', 'Generare articoli', 'Gestire contenuti'],
      color: 'bg-blue-100 text-blue-800',
    },
    {
      name: 'Viewer',
      badge: 'viewer',
      description: 'Solo lettura (ruolo di default)',
      permissions: ['Visualizzare contenuti', 'Leggere articoli', 'Accesso base'],
      color: 'bg-green-100 text-green-800',
    },
    {
      name: 'API Client',
      badge: 'api_client',
      description: 'Accesso programmatico',
      permissions: ['API REST', 'Accesso limitato', 'Automazioni'],
      color: 'bg-yellow-100 text-yellow-800',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">AutoGeorge</h1>
          <p className="mt-2 text-gray-600">Automatizza la produzione di contenuti per il tuo blog</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Sign-in Card */}
          <Card>
            <CardHeader>
              <CardTitle>Accedi al Sistema</CardTitle>
              <CardDescription>
                Scegli il tuo provider di autenticazione preferito
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.values(providers).map((provider) => (
                <Button
                  key={provider.id}
                  onClick={() => handleSignIn(provider.id)}
                  disabled={loading === provider.id}
                  variant="outline"
                  className="w-full justify-center"
                >
                  {loading === provider.id ? 'Accesso in corso...' : `Accedi con ${provider.name}`}
                </Button>
              ))}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">🎯 Dopo l'accesso</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Riceverai automaticamente il ruolo <Badge className="bg-green-100 text-green-800">viewer</Badge></li>
                  <li>• Potrai visualizzare tutti i contenuti</li>
                  <li>• Un admin può promuoverti ad <Badge className="bg-blue-100 text-blue-800">editor</Badge></li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Roles Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Sistema di Ruoli</CardTitle>
              <CardDescription>
                Comprendere i permessi e le funzionalità disponibili
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {roleInfo.map((role, index) => (
                <div key={role.badge}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{role.name}</h4>
                    <Badge className={role.color}>{role.badge}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                  <div className="text-xs text-gray-500">
                    <strong>Permessi:</strong> {role.permissions.join(', ')}
                  </div>
                  {index < roleInfo.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}

              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">💡 Note Importanti</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• I nuovi utenti iniziano come <strong>viewer</strong></li>
                  <li>• Gli admin possono modificare ruoli via API</li>
                  <li>• Ogni ruolo include tutti i permessi di livello inferiore</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Sistema implementato con Clean Architecture + RBAC</p>
        </div>
      </div>
    </div>
  );
}