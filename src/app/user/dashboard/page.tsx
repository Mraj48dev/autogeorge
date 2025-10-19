'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Plus, Globe, Rss, Calendar, BarChart3, FileText, Image } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  totalSources: number;
  activeSources: number;
  totalArticles: number;
  totalPublications: number;
  totalImages: number;
}

export default function Dashboard() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [sites, setSites] = useState<Site[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;

    const fetchSites = async () => {
      try {
        const response = await fetch('/api/admin/sites');

        if (!response.ok) {
          throw new Error('Failed to fetch sites');
        }

        const result = await response.json();

        if (result.success && result.data?.sites) {
          // Transform the nested structure
          const transformedSites = result.data.sites.map((siteInfo: any) => ({
            id: siteInfo.site.id,
            name: siteInfo.site.name,
            url: siteInfo.site.url,
            isActive: siteInfo.site.isActive,
            createdAt: siteInfo.site.createdAt,
            updatedAt: siteInfo.site.updatedAt
          }));
          setSites(transformedSites);
        } else {
          setSites([]);
        }
      } catch (err) {
        console.error('Error fetching sites:', err);
        setError('Errore nel caricamento dei siti');
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [isSignedIn]);

  const handleManageSite = (siteId: string) => {
    router.push(`/user/${siteId}/monitor`);
  };

  const handleCreateSite = () => {
    router.push('/admin/sites');
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Gestisci i tuoi siti WordPress collegati ad AutoGeorge</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Sites Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">I Tuoi Siti</h2>
              <button
                onClick={handleCreateSite}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                + Aggiungi Sito
              </button>
            </div>
          </div>

          <div className="p-6">
            {sites.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun sito configurato</h3>
                <p className="text-gray-500 mb-4">Aggiungi il tuo primo sito WordPress per iniziare</p>
                <button
                  onClick={handleCreateSite}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Aggiungi Primo Sito
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sites.map((site) => (
                  <div key={site.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">{site.name}</h3>
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {site.url}
                        </a>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        site.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {site.isActive ? 'Attivo' : 'Inattivo'}
                      </span>
                    </div>

                    <div className="text-sm text-gray-500 mb-4">
                      <p>Creato: {new Date(site.createdAt).toLocaleDateString('it-IT')}</p>
                      <p>Aggiornato: {new Date(site.updatedAt).toLocaleDateString('it-IT')}</p>
                    </div>

                    <button
                      onClick={() => handleManageSite(site.id)}
                      className="w-full bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
                    >
                      Gestisci
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}