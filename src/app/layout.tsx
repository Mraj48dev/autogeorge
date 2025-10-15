import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';

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
  return (
    <html lang="it">
      <body className="min-h-screen bg-gray-50 antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}