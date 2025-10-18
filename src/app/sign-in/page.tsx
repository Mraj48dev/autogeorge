'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">AutoGeorge</h1>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Accedi al tuo account</h2>
          <p className="text-gray-600">Continua la gestione dei tuoi contenuti automatici</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700',
                card: 'shadow-none border-0',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden'
              }
            }}
            redirectUrl="/admin/dashboard"
          />
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Non hai un account?{' '}
            <a href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Registrati qui
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}