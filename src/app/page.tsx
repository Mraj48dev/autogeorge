'use client';

import Link from 'next/link';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';

export default function HomePage() {
  const { user, isLoaded } = useUser();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">AutoGeorge</h1>
          </div>
          {!isLoaded ? (
            <div className="animate-pulse bg-gray-200 h-10 w-32 rounded-lg"></div>
          ) : user ? (
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <SignInButton mode="redirect" redirectUrl="/admin/dashboard">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                  Accedi
                </button>
              </SignInButton>
              <SignUpButton mode="redirect" redirectUrl="/admin/dashboard">
                <button className="bg-white hover:bg-gray-50 text-gray-900 px-6 py-2 rounded-lg font-medium border border-gray-200 transition-colors">
                  Registrati
                </button>
              </SignUpButton>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Generazione Automatica
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {' '}di Articoli
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Piattaforma avanzata per la creazione automatica di contenuti di qualità
            utilizzando l'intelligenza artificiale. Ottimizza il tuo workflow editoriale
            con tecnologie all'avanguardia.
          </p>
          <div className="flex justify-center space-x-4">
            {!isLoaded ? (
              <>
                <div className="animate-pulse bg-gray-200 h-12 w-40 rounded-lg"></div>
                <div className="animate-pulse bg-gray-200 h-12 w-32 rounded-lg"></div>
                <div className="animate-pulse bg-gray-200 h-12 w-48 rounded-lg"></div>
              </>
            ) : user ? (
              <>
                <Link
                  href="/admin/generate"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  Genera Articolo
                </Link>
                <Link
                  href="/monitor"
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  🔍 Monitor RSS
                </Link>
                <Link
                  href="/admin/dashboard"
                  className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-3 rounded-lg font-semibold border border-gray-200 transition-colors"
                >
                  Visualizza Dashboard
                </Link>
              </>
            ) : (
              <>
                <SignInButton mode="redirect" redirectUrl="/admin/dashboard">
                  <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105">
                    Inizia Ora
                  </button>
                </SignInButton>
                <Link
                  href="/monitor"
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  🔍 Monitor RSS
                </Link>
                <SignUpButton mode="redirect" redirectUrl="/admin/dashboard">
                  <button className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-3 rounded-lg font-semibold border border-gray-200 transition-colors">
                    Registrati Gratis
                  </button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Generazione Veloce</h3>
            <p className="text-gray-600">
              Crea articoli di qualità in pochi secondi utilizzando AI avanzata
              e sources personalizzabili per contenuti sempre aggiornati.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Clean Architecture</h3>
            <p className="text-gray-600">
              Architettura pulita e modulare che garantisce scalabilità,
              manutenibilità e testing efficace del codice.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Automazione Completa</h3>
            <p className="text-gray-600">
              Sistema completamente automatizzato dalla ricerca delle fonti
              alla pubblicazione finale su multiple piattaforme.
            </p>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Tecnologie Utilizzate
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-xl">▲</span>
              </div>
              <p className="font-medium text-gray-900">Next.js 15</p>
              <p className="text-sm text-gray-600">React Framework</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-xl">TS</span>
              </div>
              <p className="font-medium text-gray-900">TypeScript</p>
              <p className="text-sm text-gray-600">Type Safety</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <p className="font-medium text-gray-900">Prisma ORM</p>
              <p className="text-sm text-gray-600">Database</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-xl">AI</span>
              </div>
              <p className="font-medium text-gray-900">Perplexity AI</p>
              <p className="text-sm text-gray-600">Content Generation</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 mt-16 border-t border-gray-200">
        <div className="text-center text-gray-600">
          <p>&copy; 2024 AutoGeorge. Tutti i diritti riservati.</p>
          <p className="mt-2 text-sm">
            Powered by AI • Built with ❤️ • Clean Architecture
          </p>
        </div>
      </footer>
    </div>
  );
}