'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

/**
 * Forgot Password Page
 * Simple placeholder for password reset functionality
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Simulate password reset (placeholder implementation)
    setTimeout(() => {
      setMessage({
        type: 'success',
        text: 'Se l\'email esiste nel sistema, riceverai istruzioni per il reset della password.',
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Password Dimenticata</h1>
          <p className="mt-2 text-gray-600">Inserisci la tua email per il reset</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Ti invieremo un link per reimpostare la password
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="la.tua.email@example.com"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Invio in corso...' : 'Invia Link Reset'}
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

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link href="/auth/login" className="text-blue-600 hover:underline text-sm">
                ← Torna al Login
              </Link>
            </div>

            {/* Note */}
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                📧 <strong>Nota:</strong> Questa è una funzionalità placeholder.
                In produzione, qui verrebbe integrato un servizio email per il reset password.
              </p>
            </div>

          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>Non riesci ancora ad accedere? Contatta il supporto</p>
        </div>

      </div>
    </div>
  );
}