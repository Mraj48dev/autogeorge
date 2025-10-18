'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Rss, ExternalLink, Plus, Settings, Activity } from 'lucide-react';

interface Source {
  id: string;
  name: string;
  type: string;
  url: string;
  isActive: boolean;
  lastFetch?: string;
  totalItems?: number;
}

export default function SiteSources() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSources();
  }, [siteId]);

  const fetchSources = async () => {
    try {
      // For now, fetch all sources and filter by siteId in future
      const response = await fetch('/api/admin/sources');
      if (response.ok) {
        const result = await response.json();
        // TODO: Filter by siteId when backend supports it
        setSources(result.sources || []);
      }
    } catch (error) {
      console.error('Error fetching sources:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sources</h1>
          <p className="text-muted-foreground">
            Gestisci le fonti di contenuto per questo sito
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi Source
        </Button>
      </div>

      {/* Sources List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Caricamento sources...</p>
        </div>
      ) : (
        <>
          {sources.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Rss className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessuna Source Configurata</h3>
                <p className="text-gray-600 text-center mb-4">
                  Aggiungi la tua prima fonte di contenuto per questo sito
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Prima Source
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sources.map((source) => (
                <Card key={source.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{source.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <ExternalLink className="w-3 h-3" />
                          <span className="text-xs">{source.type}</span>
                        </CardDescription>
                      </div>
                      <Badge variant={source.isActive ? "default" : "secondary"}>
                        {source.isActive ? (
                          <>
                            <Activity className="w-3 h-3 mr-1" />
                            Attiva
                          </>
                        ) : (
                          "Inattiva"
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-gray-600">
                      <p className="truncate">{source.url}</p>
                      {source.lastFetch && (
                        <p className="text-xs text-gray-500 mt-1">
                          Ultimo fetch: {new Date(source.lastFetch).toLocaleDateString()}
                        </p>
                      )}
                      {source.totalItems && (
                        <p className="text-xs text-gray-500">
                          {source.totalItems} articoli
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="w-4 h-4 mr-1" />
                        Gestisci
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Site ID Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-700">
                <strong>Sito ID:</strong> {siteId}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Questa pagina mostra tutte le sources disponibili. In futuro verranno filtrate per questo sito.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}