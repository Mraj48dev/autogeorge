'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Loader2, ExternalLink, Activity, FileText, Rss, TrendingUp, Settings, Plus } from 'lucide-react';

interface SiteStatistics {
  totalSources: number;
  totalArticles: number;
  articlesPublished: number;
  articlesPending: number;
  isPublishing: boolean;
  lastPublishAt?: string;
  lastError?: string;
}

interface Site {
  id: string;
  userId: string;
  name: string;
  url: string;
  isActive: boolean;
  lastError?: string;
  enableAutoGeneration: boolean;
  enableAutoPublish: boolean;
}

interface UserSiteInfo {
  site: Site;
  statistics: SiteStatistics;
}

export default function SiteDashboard() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [siteInfo, setSiteInfo] = useState<UserSiteInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSiteInfo();
  }, [siteId]);

  const fetchSiteInfo = async () => {
    try {
      const response = await fetch('/api/admin/sites');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const foundSite = result.data.sites.find((s: UserSiteInfo) => s.site.id === siteId);
          if (foundSite) {
            setSiteInfo(foundSite);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching site info:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSiteStatusBadge = (site: Site, stats: SiteStatistics) => {
    if (stats.isPublishing) {
      return <Badge variant="default" className="bg-blue-500"><Activity className="w-3 h-3 mr-1" />Pubblicando</Badge>;
    }
    if (site.lastError) {
      return <Badge variant="destructive">Errore</Badge>;
    }
    if (!site.isActive) {
      return <Badge variant="secondary">Inattivo</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Attivo</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!siteInfo) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-900">Sito non trovato</h2>
        <p className="text-gray-600 mt-2">Il sito richiesto non esiste o non hai i permessi per accedervi.</p>
      </div>
    );
  }

  const { site, statistics } = siteInfo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Panoramica del sito {site.name}
            </p>
          </div>
          {getSiteStatusBadge(site, statistics)}
        </div>
      </div>

      {/* Site Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Informazioni Sito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900">Nome</h3>
              <p className="text-gray-600">{site.name}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">URL</h3>
              <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {site.url}
              </a>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Generazione Automatica</h3>
              <p className="text-gray-600">{site.enableAutoGeneration ? 'Attiva' : 'Disattiva'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Pubblicazione Automatica</h3>
              <p className="text-gray-600">{site.enableAutoPublish ? 'Attiva' : 'Disattiva'}</p>
            </div>
          </div>

          {site.lastError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800">Ultimo Errore</h4>
              <p className="text-red-700 text-sm mt-1">{site.lastError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fonti Attive</CardTitle>
            <Rss className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalSources}</div>
            <p className="text-xs text-muted-foreground">
              Sources configurate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Articoli Totali</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalArticles}</div>
            <p className="text-xs text-muted-foreground">
              Articoli generati
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pubblicati</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.articlesPublished}</div>
            <p className="text-xs text-muted-foreground">
              Su WordPress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Attesa</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statistics.articlesPending}</div>
            <p className="text-xs text-muted-foreground">
              Da pubblicare
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Azioni Rapide</CardTitle>
          <CardDescription>
            Gestisci rapidamente il tuo sito
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button asChild className="h-auto p-4 flex-col space-y-2">
              <a href={`/admin/sites/${siteId}/generate`}>
                <Plus className="w-6 h-6" />
                <span>Genera Nuovo Articolo</span>
              </a>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
              <a href={`/admin/sites/${siteId}/sources`}>
                <Rss className="w-6 h-6" />
                <span>Gestisci Sources</span>
              </a>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 flex-col space-y-2">
              <a href={`/admin/sites/${siteId}/settings`}>
                <Settings className="w-6 h-6" />
                <span>Impostazioni Sito</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}