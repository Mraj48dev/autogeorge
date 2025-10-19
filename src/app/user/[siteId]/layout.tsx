'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface Site {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
}

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const { isLoaded, isSignedIn } = useUser();
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const siteId = params.siteId as string;

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn || !siteId) return;

    const fetchSite = async () => {
      try {
        const response = await fetch('/api/admin/sites');

        if (!response.ok) {
          throw new Error('Failed to fetch sites');
        }

        const result = await response.json();

        if (result.success && result.data?.sites) {
          const userSite = result.data.sites.find((siteInfo: any) => siteInfo.site.id === siteId);

          if (userSite) {
            setSite({
              id: userSite.site.id,
              name: userSite.site.name,
              url: userSite.site.url,
              isActive: userSite.site.isActive
            });
          } else {
            // Site not found or user doesn't have access
            router.push('/user/dashboard');
          }
        }
      } catch (err) {
        console.error('Error fetching site:', err);
        router.push('/user/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchSite();
  }, [isSignedIn, siteId, router]);

  if (!isLoaded || !isSignedIn || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sito non trovato</h2>
          <p className="text-gray-600 mb-4">Il sito che stai cercando non esiste o non hai i permessi per accedervi.</p>
          <Link
            href="/user/dashboard"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const navigationItems = [
    { name: 'Monitor', href: `/user/${siteId}/monitor`, icon: '📊' },
    { name: 'Genera Articolo', href: `/user/${siteId}/generate`, icon: '✨' },
    { name: 'Sources', href: `/user/${siteId}/sources`, icon: '📡' },
    { name: 'Articoli', href: `/user/${siteId}/articles`, icon: '📄' },
    { name: 'Prompt Usati', href: `/user/${siteId}/prompts`, icon: '🤖' },
    { name: 'Impostazioni', href: `/user/${siteId}/settings`, icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          {/* Site Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-lg font-semibold text-gray-900 truncate">{site.name}</h1>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                site.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {site.isActive ? 'Attivo' : 'Inattivo'}
              </span>
            </div>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 truncate block"
            >
              {site.url}
            </a>
            <Link
              href="/user/dashboard"
              className="text-sm text-gray-500 hover:text-gray-700 mt-2 inline-block"
            >
              ← Torna alla Dashboard
            </Link>
          </div>

          {/* Navigation */}
          <nav className="p-4">
            <ul className="space-y-2">
              {navigationItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}