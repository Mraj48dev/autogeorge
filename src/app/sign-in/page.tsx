import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🚀 AutoGeorge
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistema di autenticazione ultra-sicuro
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <h4 className="text-sm font-medium text-green-800 mb-2">
            ✅ SICUREZZA ENTERPRISE-GRADE
          </h4>
          <ul className="text-xs text-green-700 space-y-1">
            <li>• Email verification automatica</li>
            <li>• Multi-factor authentication</li>
            <li>• Rate limiting integrato</li>
            <li>• Protezione anti-bot</li>
            <li>• Session management sicuro</li>
          </ul>
        </div>

        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm',
              card: 'shadow-lg',
            }
          }}
        />

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Powered by Clerk.com - Sicurezza certificata
          </p>
        </div>
      </div>
    </div>
  );
}