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

export default function MonitorPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/debug/rss-logs');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result);
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
    fetchData();

    // Auto-refresh ogni 30 secondi
    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, []);

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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento monitoraggio RSS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-bold mb-2">❌ Errore di connessione</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            🔄 Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🔍 AutoGeorge RSS Monitor
              </h1>
              <p className="text-gray-600">
                Monitoraggio in tempo reale dei feed RSS configurati
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Ultimo aggiornamento</p>
              <p className="text-lg font-semibold text-blue-600">{lastUpdate}</p>
              <button
                onClick={fetchData}
                disabled={loading}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '🔄 Aggiornando...' : '🔄 Aggiorna'}
              </button>
            </div>
          </div>
        </div>

        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                <div key={source.id} className="bg-white rounded-lg shadow-lg p-6">
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
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">🌟 Il tuo sito di test</h3>
              <p className="text-yellow-700">
                Il monitoraggio del feed <strong>limegreen-termite-635510.hostingersite.com</strong> è attivo!
                Ogni nuovo articolo che pubblichi sarà automaticamente rilevato entro 60 secondi.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}