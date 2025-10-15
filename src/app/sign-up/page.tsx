import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🚀 AutoGeorge
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Registrati con sicurezza enterprise
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            🔒 PROCESSO REGISTRAZIONE SICURO
          </h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Verifica email automatica</li>
            <li>• Password policy enterprise</li>
            <li>• Protezione brute-force</li>
            <li>• GDPR compliant</li>
            <li>• Zero vulnerabilità</li>
          </ul>
        </div>

        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-green-600 hover:bg-green-700 text-sm',
              card: 'shadow-lg',
            }
          }}
        />

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Powered by Clerk.com - Standard industria
          </p>
        </div>
      </div>
    </div>
  );
}