'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Registrati su AutoGeorge
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Crea il tuo account per accedere alla piattaforma
          </p>
        </div>
        <SignUp
          path="/signup"
          routing="path"
          signInUrl="/registration"
          redirectUrl="/admin"
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
              card: 'shadow-lg'
            }
          }}
        />
      </div>
    </div>
  );
}