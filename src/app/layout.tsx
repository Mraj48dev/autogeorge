import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoGeorge - Generazione Automatica Articoli',
  description: 'Piattaforma di generazione automatica e pubblicazione di articoli con Clean Architecture',
  keywords: ['content-generation', 'ai', 'automation', 'articoli', 'blog'],
  authors: [{ name: 'AutoGeorge Team', url: 'https://autogeorge.dev' }],
  openGraph: {
    title: 'AutoGeorge - Generazione Automatica Articoli',
    description: 'Piattaforma di generazione automatica e pubblicazione di articoli con Clean Architecture',
    url: 'https://autogeorge.vercel.app',
    siteName: 'AutoGeorge',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AutoGeorge - Generazione Automatica Articoli',
    description: 'Piattaforma di generazione automatica e pubblicazione di articoli con Clean Architecture',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Clerk Auth Provider for the entire app
  return (
    <ClerkProvider>
      <html lang="it">
        <body className="min-h-screen bg-gray-50 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}