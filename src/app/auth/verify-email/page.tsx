'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { CheckCircle, XCircle, AlertCircle, Mail, ArrowRight } from 'lucide-react';

interface VerificationResult {
  success: boolean;
  message: string;
  email?: string;
  userId?: string;
  isNewUser?: boolean;
}

/**
 * Email Verification Confirmation Page
 * Handles verification links and shows appropriate success/error states
 */
export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verificationState, setVerificationState] = useState<'loading' | 'success' | 'error'>('loading');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [errorType, setErrorType] = useState<string>('');

  // Get URL parameters
  const token = searchParams.get('token');
  const success = searchParams.get('success');
  const error = searchParams.get('error');

  useEffect(() => {
    const handleVerification = async () => {
      // Handle direct success/error from URL parameters (redirected from GET endpoint)
      if (success === 'true') {
        setVerificationState('success');
        setResult({
          success: true,
          message: 'Email verificata con successo!',
        });
        return;
      }

      if (error) {
        setVerificationState('error');
        setErrorType(error);

        const errorMessages: Record<string, string> = {
          'missing_token': 'Token di verifica mancante o non valido',
          'verification_failed': 'Verifica fallita. Il token potrebbe essere scaduto o già utilizzato.',
          'server_error': 'Errore del server durante la verifica. Riprova più tardi.',
        };

        setResult({
          success: false,
          message: errorMessages[error] || 'Errore durante la verifica dell\'email',
        });
        return;
      }

      // If we have a token, attempt verification via POST API
      if (token) {
        try {
          const response = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            setVerificationState('success');
            setResult(data);
          } else {
            setVerificationState('error');
            setResult({
              success: false,
              message: data.message || 'Errore durante la verifica dell\'email',
            });
          }
        } catch (err) {
          console.error('Verification error:', err);
          setVerificationState('error');
          setResult({
            success: false,
            message: 'Errore di connessione durante la verifica',
          });
        }
      } else {
        // No token and no direct success/error - show default state
        setVerificationState('error');
        setResult({
          success: false,
          message: 'Link di verifica non valido',
        });
      }
    };

    handleVerification();
  }, [token, success, error]);

  const handleReturnToLogin = () => {
    router.push('/auth/login');
  };

  const handleGoToRegister = () => {
    router.push('/auth/register');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Verifica Email</h1>
          <p className="mt-2 text-gray-600">Conferma del tuo indirizzo email</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            {verificationState === 'loading' && (
              <>
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
                <CardTitle className="text-xl">Verifica in corso...</CardTitle>
                <CardDescription>
                  Stiamo verificando il tuo indirizzo email
                </CardDescription>
              </>
            )}

            {verificationState === 'success' && (
              <>
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-xl text-green-800">Email Verificata!</CardTitle>
                <CardDescription>
                  Il tuo indirizzo email è stato confermato con successo
                </CardDescription>
              </>
            )}

            {verificationState === 'error' && (
              <>
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="text-xl text-red-800">Verifica Fallita</CardTitle>
                <CardDescription>
                  Si è verificato un problema durante la verifica
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Result Message */}
            {result && (
              <div className={`p-4 rounded-lg border ${
                result.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-start space-x-3">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{result.message}</p>
                    {result.email && (
                      <p className="text-sm mt-1">Email: {result.email}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Success State Content */}
            {verificationState === 'success' && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">🎉 Account Attivato</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Il tuo account è ora completamente attivo</li>
                    <li>• Puoi accedere alla piattaforma</li>
                    <li>• Hai accesso alle funzionalità base come <Badge className="bg-green-100 text-green-800">viewer</Badge></li>
                  </ul>
                </div>

                <Button
                  onClick={handleReturnToLogin}
                  className="w-full"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Accedi al tuo Account
                </Button>
              </div>
            )}

            {/* Error State Content */}
            {verificationState === 'error' && (
              <div className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-900 mb-2">💡 Cosa puoi fare ora</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Controlla se hai ricevuto un'altra email di verifica</li>
                    <li>• Verifica che il link non sia scaduto (valido 24 ore)</li>
                    <li>• Prova a registrarti nuovamente se necessario</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleReturnToLogin}
                    className="w-full"
                    variant="outline"
                  >
                    Prova ad Accedere
                  </Button>

                  <Button
                    onClick={handleGoToRegister}
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Registrati di Nuovo
                  </Button>
                </div>
              </div>
            )}

            {/* Loading State Content */}
            {verificationState === 'loading' && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Attendere mentre verifichiamo il token...
                </p>
              </div>
            )}

            {/* Navigation Links */}
            <div className="pt-4 border-t border-gray-200">
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Hai bisogno di aiuto?</p>
                <div className="space-x-4">
                  <Link href="/auth/login" className="text-blue-600 hover:underline text-sm">
                    Pagina di Login
                  </Link>
                  <span className="text-gray-400">•</span>
                  <Link href="/auth/register" className="text-blue-600 hover:underline text-sm">
                    Registrazione
                  </Link>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Problemi con la verifica? Riprova la registrazione</p>
        </div>

      </div>
    </div>
  );
}