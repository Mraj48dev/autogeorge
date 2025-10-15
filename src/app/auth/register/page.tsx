'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Classic Registration Page with Username/Password
 * Creates users directly via Auth Module
 */
export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
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

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Le password non corrispondono' });
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setMessage({ type: 'error', text: 'La password deve essere di almeno 8 caratteri' });
      setLoading(false);
      return;
    }

    try {
      // Call our Auth Module API to create user
      const response = await fetch('/api/admin/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          password: formData.password, // In production, this should be hashed
          userAgent: navigator.userAgent,
          ipAddress: 'registration-form',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Send verification email after successful registration
        try {
          const verificationResponse = await fetch('/api/auth/send-verification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: formData.email,
              name: formData.name,
              baseUrl: window.location.origin,
            }),
          });

          const verificationResult = await verificationResponse.json();

          if (verificationResponse.ok && verificationResult.success) {
            setMessage({
              type: 'success',
              text: `Account creato con successo! Ti abbiamo inviato un'email di verifica a ${formData.email}. Controlla la tua casella di posta per completare la registrazione.`,
            });
          } else {
            setMessage({
              type: 'success',
              text: `Account creato con successo! Ruolo assegnato: ${result.user?.role || 'viewer'}. ⚠️ Email di verifica non inviata.`,
            });
          }
        } catch (emailError) {
          console.warn('Failed to send verification email:', emailError);
          setMessage({
            type: 'success',
            text: `Account creato con successo! Ruolo assegnato: ${result.user?.role || 'viewer'}. ⚠️ Email di verifica non disponibile.`,
          });
        }

        // Reset form
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Errore durante la registrazione',
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Registrazione</h1>
          <p className="mt-2 text-gray-600">Crea il tuo account AutoGeorge</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nuovo Account</CardTitle>
            <CardDescription>
              Compila i campi per creare il tuo account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Il tuo nome completo"
                />
              </div>

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
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Almeno 8 caratteri"
                />
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Conferma Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ripeti la password"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Creazione account...' : 'Crea Account'}
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

            {/* Role Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">🎯 Dopo la registrazione</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Riceverai automaticamente il ruolo <Badge className="bg-green-100 text-green-800">viewer</Badge></li>
                <li>• Potrai visualizzare tutti i contenuti</li>
                <li>• Un admin può promuoverti ad <Badge className="bg-blue-100 text-blue-800">editor</Badge></li>
              </ul>
            </div>

            {/* Alternative Login */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600">Hai già un account?</p>
              <div className="space-x-4">
                <Link href="/auth/login" className="text-blue-600 hover:underline text-sm">
                  Accedi con email/password
                </Link>
                <span className="text-gray-400">•</span>
                <Link href="/auth/signin" className="text-blue-600 hover:underline text-sm">
                  Login con Google/GitHub
                </Link>
              </div>
            </div>

          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>Creando un account accetti i nostri termini di servizio</p>
        </div>

      </div>
    </div>
  );
}