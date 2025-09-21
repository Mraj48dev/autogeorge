'use client';

import { useState, useEffect } from 'react';

interface MonitoringData {
  timestamp: string;
  sources: {
    id: string;
    name: string;
    url: string;
    status: string;
    lastFetchAt?: string;
    lastError?: string;
    totalItems: number;
    recentItems: {
      title: string;
      publishedAt: string;
      fetchedAt: string;
    }[];
  }[];
  summary: {
    totalSources: number;
    activeSources: number;
    sourcesWithErrors: number;
    totalFeedItems: number;
    unprocessedItems: number;
  };
}

export default function AdminMonitorPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const triggerPolling = async () => {
    try {
      console.log('🔄 Triggering RSS polling...');
      const response = await fetch('/api/cron/poll-feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ immediate: true })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Polling triggered successfully:', result);
        return true;
      } else {
        console.warn('⚠️ Polling trigger failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Error triggering polling:', error);
      return false;
    }
  };

  const fetchData = async (triggerPollingFirst = false) => {
    try {
      setLoading(true);

      // Se richiesto, triggera prima il polling RSS
      if (triggerPollingFirst) {
        await triggerPolling();
        // Aspetta un momento per permettere al polling di completare
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      const response = await fetch('/api/debug/rss-logs');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Ordina gli articoli recenti di ogni source dal più recente al più vecchio
        const sortedResult = {
          ...result,
          sources: result.sources.map((source: any) => ({
            ...source,
            recentItems: source.recentItems.sort((a: any, b: any) => {
              return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
            })
          }))
        };
        setData(sortedResult);
        setError(null);
      } else {
        setError(result.error || 'Errore sconosciuto');
      }

      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di rete');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Caricamento iniziale con polling
    fetchData(true);

    if (autoRefresh) {
      // Auto-refresh ogni 30 secondi con polling RSS ogni 3 cicli (ogni 90 secondi)
      let cycleCount = 0;
      const interval = setInterval(() => {
        cycleCount++;
        const shouldTriggerPolling = cycleCount % 3 === 0; // Ogni 90 secondi
        fetchData(shouldTriggerPolling);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'error': return '🔴';
      case 'paused': return '🟡';
      default: return '⚪';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('it-IT');
    } catch {
      return dateString;
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento monitoraggio RSS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-red-800 font-bold mb-2">❌ Errore di connessione</h2>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          🔄 Riprova
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              🔍 Monitor RSS Feed
            </h1>
            <p className="text-gray-600">
              Monitoraggio in tempo reale dei feed RSS configurati
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Ultimo aggiornamento</p>
            <p className="text-lg font-semibold text-blue-600">{lastUpdate}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => fetchData(false)}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '🔄 Aggiornando...' : '🔄 Aggiorna'}
              </button>
              <button
                onClick={() => fetchData(true)}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '📡 Polling...' : '📡 Polling RSS'}
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded ${
                  autoRefresh
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {autoRefresh ? '⏸️ Pausa' : '▶️ Auto'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-blue-800 text-sm">Sources Totali</h3>
              <p className="text-2xl font-bold text-blue-600">{data.summary.totalSources}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h3 className="font-semibold text-green-800 text-sm">Sources Attivi</h3>
              <p className="text-2xl font-bold text-green-600">{data.summary.activeSources}</p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h3 className="font-semibold text-red-800 text-sm">Con Errori</h3>
              <p className="text-2xl font-bold text-red-600">{data.summary.sourcesWithErrors}</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h3 className="font-semibold text-purple-800 text-sm">Articoli Totali</h3>
              <p className="text-2xl font-bold text-purple-600">{data.summary.totalFeedItems}</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 text-sm">Non Processati</h3>
              <p className="text-2xl font-bold text-yellow-600">{data.summary.unprocessedItems}</p>
            </div>
          </div>

          {/* Sources List */}
          <div className="space-y-4">
            {data.sources.map((source) => (
              <div key={source.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getStatusIcon(source.status)}</span>
                      <h3 className="text-xl font-bold text-gray-900">{source.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        source.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : source.status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {source.status.toUpperCase()}
                      </span>
                      {source.url?.includes('limegreen-termite-635510.hostingersite.com') && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                          🌟 TUO SITO TEST
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 mb-2">
                      🔗 <a href={source.url} target="_blank" rel="noopener noreferrer"
                           className="text-blue-600 hover:underline">
                        {source.url}
                      </a>
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Ultimo fetch:</span>
                        <p className="text-gray-600">
                          {source.lastFetchAt ? formatDate(source.lastFetchAt) : 'Mai'}
                        </p>
                      </div>

                      <div>
                        <span className="font-semibold">Articoli salvati:</span>
                        <p className="text-gray-600">{source.totalItems}</p>
                      </div>
                    </div>

                    {source.lastError && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-red-800 text-sm">
                          <strong>⚠️ Ultimo errore:</strong> {source.lastError}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Items */}
                {source.recentItems.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-800 mb-2">📰 Articoli Recenti</h4>
                    <div className="space-y-2">
                      {source.recentItems.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded">
                          <p className="font-medium text-gray-900 truncate">{item.title}</p>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>📅 Pubblicato: {formatDate(item.publishedAt)}</span>
                            <span>📥 Fetched: {formatDate(item.fetchedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Special Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">🎯 Sistema di Monitoraggio Intelligente</h3>
            <p className="text-yellow-700">
              <strong>🚀 NUOVA SOLUZIONE</strong>: Dashboard con polling automatico ogni 90 secondi.
              Clicca "📡 Polling RSS" per il controllo manuale immediato dei feed.
            </p>
            <p className="text-yellow-700 mt-2">
              Il sistema funziona senza limitazioni di Vercel Hobby plan. Ogni nuovo articolo
              verrà rilevato automaticamente e mostrato qui in tempo reale.
            </p>
            <p className="text-yellow-700 mt-2">
              <strong>Il tuo sito di test</strong>: limegreen-termite-635510.hostingersite.com viene
              monitorato con priorità e apparirà con l'etichetta 🌟 TUO SITO TEST.
            </p>
          </div>
        </>
      )}
    </div>
  );
}