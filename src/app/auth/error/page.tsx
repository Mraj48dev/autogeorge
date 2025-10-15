'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'Sistema di autenticazione non configurato correttamente.';
      case 'AccessDenied':
        return 'Accesso negato. Non hai i permessi necessari.';
      case 'Verification':
        return 'Token di verifica non valido o scaduto.';
      case 'Default':
        return 'Si è verificato un errore durante l\'autenticazione.';
      default:
        return 'Errore di autenticazione sconosciuto.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🚨 Errore di Autenticazione
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Si è verificato un problema durante l'accesso
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {getErrorMessage(error)}
              </h3>
              {error && (
                <p className="mt-1 text-sm text-red-700">
                  Codice errore: {error}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              🔐 Come risolvere:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Verifica di aver inserito email e password corrette</li>
              <li>• Assicurati che il tuo account sia verificato tramite email</li>
              <li>• Se non hai un account, registrati prima</li>
              <li>• Controlla la cartella spam per l'email di verifica</li>
            </ul>
          </div>

          <div className="flex space-x-4">
            <a
              href="/auth/signin"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-center transition duration-200"
            >
              🔑 Torna al Login
            </a>
            <a
              href="/api/auth/register"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md text-center transition duration-200"
            >
              ✅ Registrati
            </a>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            AutoGeorge - Sistema di autenticazione sicuro
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}