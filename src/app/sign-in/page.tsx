'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Accedi ad AutoGeorge
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Accedi al tuo account per continuare
          </p>
        </div>
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          redirectUrl="/admin"
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
              card: 'shadow-lg'
            }
          }}
        />
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Non hai un account?{' '}
            <a href="/sign-up" className="font-medium text-blue-600 hover:text-blue-500">
              Registrati qui
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}