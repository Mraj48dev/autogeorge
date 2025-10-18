'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { BUILD_INFO } from '@/lib/buildinfo';
import LiveClock from '@/components/LiveClock';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

interface SiteLayoutProps {
  children: ReactNode;
}

interface Site {
  id: string;
  name: string;
  url: string;
}

export default function SiteLayout({ children }: SiteLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const siteId = params.siteId as string;
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSite();
  }, [siteId]);

  const fetchSite = async () => {
    try {
      const response = await fetch('/api/admin/sites');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const foundSite = result.data.sites.find((s: any) => s.site.id === siteId);
          if (foundSite) {
            setSite(foundSite.site);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching site:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPageName = () => {
    const segments = pathname.split('/');
    const lastSegment = segments[segments.length - 1];

    switch (lastSegment) {
      case 'dashboard': return 'Dashboard';
      case 'sources': return 'Sources';
      case 'articles': return 'Articoli';
      case 'settings': return 'Impostazioni';
      case 'publishing': return 'Publishing';
      case 'generate': return 'Genera Articolo';
      case 'image-prompts': return 'Prompt Immagini';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin/sites" className="flex items-center space-x-2 mr-4">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Tutti i Siti
                </Button>
              </Link>
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AG</span>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {loading ? 'Caricamento...' : site?.name || 'Sito Non Trovato'}
                  </h1>
                  {site && (
                    <p className="text-xs text-gray-500">{site.url}</p>
                  )}
                </div>
              </Link>
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
          {/* Breadcrumb */}
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center text-sm text-gray-600">
              <Home className="w-4 h-4 mr-1" />
              <Link href="/admin/sites" className="hover:text-gray-900">
                Siti
              </Link>
              <span className="mx-2">/</span>
              <span className="text-gray-900">{site?.name || 'Site'}</span>
              <span className="mx-2">/</span>
              <span className="text-gray-900">{getCurrentPageName()}</span>
            </div>
          </div>

          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href={`/admin/sites/${siteId}/dashboard`}
                  className={`flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors ${
                    pathname.endsWith('/dashboard') ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <div className="w-5 h-5 mr-3 bg-blue-100 rounded flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">📊</span>
                  </div>
                  <span className="font-medium">Dashboard</span>
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/sites/${siteId}/generate`}
                  className={`flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors ${
                    pathname.endsWith('/generate') ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <div className="w-5 h-5 mr-3 bg-purple-100 rounded flex items-center justify-center">
                    <span className="text-purple-600 text-xs font-bold">✚</span>
                  </div>
                  <span className="font-medium">Genera Articolo</span>
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/sites/${siteId}/articles`}
                  className={`flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors ${
                    pathname.endsWith('/articles') ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <div className="w-5 h-5 mr-3 bg-green-100 rounded flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">📄</span>
                  </div>
                  <span className="font-medium">Articoli</span>
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/sites/${siteId}/sources`}
                  className={`flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors ${
                    pathname.endsWith('/sources') ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <div className="w-5 h-5 mr-3 bg-indigo-100 rounded flex items-center justify-center">
                    <span className="text-indigo-600 text-xs font-bold">🔗</span>
                  </div>
                  <span className="font-medium">Sources</span>
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/sites/${siteId}/publishing`}
                  className={`flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors ${
                    pathname.endsWith('/publishing') ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <div className="w-5 h-5 mr-3 bg-red-100 rounded flex items-center justify-center">
                    <span className="text-red-600 text-xs font-bold">📤</span>
                  </div>
                  <span className="font-medium">Publishing</span>
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/sites/${siteId}/image-prompts`}
                  className={`flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors ${
                    pathname.endsWith('/image-prompts') ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <div className="w-5 h-5 mr-3 bg-pink-100 rounded flex items-center justify-center">
                    <span className="text-pink-600 text-xs font-bold">🎨</span>
                  </div>
                  <span className="font-medium">Prompt Immagini</span>
                </Link>
              </li>
              <li>
                <Link
                  href={`/admin/sites/${siteId}/settings`}
                  className={`flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors ${
                    pathname.endsWith('/settings') ? 'bg-blue-50 text-blue-700' : ''
                  }`}
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
                Sito: {site?.name || 'Caricamento...'}
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