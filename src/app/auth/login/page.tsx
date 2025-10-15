'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Classic Login Page with Email/Password
 * Integrates with NextAuth credentials provider
 */
export default function LoginPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Use NextAuth signIn with credentials
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setMessage({
          type: 'error',
          text: 'Email o password non corretti',
        });
      } else if (result?.ok) {
        setMessage({
          type: 'success',
          text: 'Accesso effettuato con successo! Reindirizzamento...',
        });

        // Redirect to dashboard after successful login
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1500);
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage({
        type: 'error',
        text: 'Errore di connessione. Riprova.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Accesso</h1>
          <p className="mt-2 text-gray-600">Entra nel tuo account AutoGeorge</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Inserisci le tue credenziali per accedere
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="la.tua.email@example.com"
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="La tua password"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Accesso in corso...' : 'Accedi'}
              </Button>

              {/* Message Display */}
              {message && (
                <div className={`p-3 rounded-md ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {message.text}
                </div>
              )}

            </form>

            {/* Forgot Password */}
            <div className="mt-4 text-center">
              <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
                Password dimenticata?
              </Link>
            </div>

            {/* Alternative Login Methods */}
            <div className="mt-6 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Oppure</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn('google')}
                >
                  Accedi con Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn('github')}
                >
                  Accedi con GitHub
                </Button>
              </div>
            </div>

            {/* Registration Link */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600">Non hai ancora un account?</p>
              <Link href="/auth/register" className="text-blue-600 hover:underline text-sm font-medium">
                Registrati ora
              </Link>
            </div>

          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>Accedendo accetti i nostri termini di servizio</p>
        </div>

      </div>
    </div>
  );
}