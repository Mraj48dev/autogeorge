import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Registrati ad AutoGeorge
          </h1>
          <p className="text-gray-600">
            Crea il tuo account per iniziare a generare articoli automaticamente
          </p>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg border-0",
            }
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/admin/dashboard"
          fallbackRedirectUrl="/admin/dashboard"
        />
      </div>
    </div>
  );
}