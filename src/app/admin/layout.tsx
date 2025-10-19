'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BUILD_INFO } from '@/lib/buildinfo';
import LiveClock from '@/components/LiveClock';
import { SiteProvider, useSiteContext } from '@/contexts/SiteContext';
import { SiteSelector } from '@/components/ui/SiteSelector';

interface AdminLayoutProps {
  children: ReactNode;
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { currentSite, isLoading: sitesLoading } = useSiteContext();

  // Special page that doesn't need the full layout (only sites selection page)
  const isSitesSelectionPage = pathname === '/admin/sites';

  if (isSitesSelectionPage) {
    return <>{children}</>;
  }

  // Show loading state while sites are loading
  if (sitesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Caricamento siti...</p>
        </div>
      </div>
    );
  }

  // If no site selected, redirect to sites selection
  if (!currentSite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Nessun sito selezionato</h2>
          <p className="text-gray-600 mb-4">Seleziona un sito per continuare</p>
          <Link
            href="/admin/sites"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Seleziona Sito
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AG</span>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  AutoGeorge
                </h1>
              </Link>

              {/* Site Selector */}
              <div className="border-l border-gray-200 pl-4">
                <SiteSelector />
              </div>
            </div>
            <div className="text-sm text-gray-500">
              <div>v1.0.0</div>
              <LiveClock />
              <div className="text-xs">
                Deploy: {BUILD_INFO.buildTime}
              </div>
              <div className="text-xs text-gray-400">
                #{BUILD_INFO.commitHash}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="bg-white w-64 min-h-screen shadow-sm border-r">
          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin/dashboard"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-blue-100 rounded flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">📊</span>
                  </div>
                  <span className="font-medium">Dashboard</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/generate"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-purple-100 rounded flex items-center justify-center">
                    <span className="text-purple-600 text-xs font-bold">✚</span>
                  </div>
                  <span className="font-medium">Genera Articolo</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/articles"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-green-100 rounded flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">📄</span>
                  </div>
                  <span className="font-medium">Articoli</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/sites"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-blue-100 rounded flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">🌐</span>
                  </div>
                  <span className="font-medium">Siti</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/sources"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-indigo-100 rounded flex items-center justify-center">
                    <span className="text-indigo-600 text-xs font-bold">🔗</span>
                  </div>
                  <span className="font-medium">Sources</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/publishing"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-red-100 rounded flex items-center justify-center">
                    <span className="text-red-600 text-xs font-bold">📤</span>
                  </div>
                  <span className="font-medium">Publishing</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/image-prompts"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-pink-100 rounded flex items-center justify-center">
                    <span className="text-pink-600 text-xs font-bold">🎨</span>
                  </div>
                  <span className="font-medium">Prompt Immagini</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/settings"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-orange-100 rounded flex items-center justify-center">
                    <span className="text-orange-600 text-xs font-bold">⚙️</span>
                  </div>
                  <span className="font-medium">Impostazioni</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Health Status */}
          <div className="mt-auto p-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm text-green-700 font-medium">Sistema Online</span>
              </div>
              <div className="text-xs text-green-600 mt-1">
                Perplexity AI: Connesso
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-gray-50 min-h-screen">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SiteProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </SiteProvider>
  );
}