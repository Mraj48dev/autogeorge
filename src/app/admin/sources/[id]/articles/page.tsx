'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Contenuto {
  id: string;
  title: string;
  content: string;
  url?: string;
  sourceId: string;
  publishedAt: string;
  fetchedAt: string;
  processed: boolean;
  guid?: string;
  articleId?: string;
}

interface Source {
  id: string;
  name: string;
  type: string;
  url?: string;
  status: string;
}

export default function SourceContenutiPage() {
  const params = useParams();
  const router = useRouter();
  const sourceId = params.id as string;

  const [source, setSource] = useState<Source | null>(null);
  const [contenuti, setContenuti] = useState<Contenuto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sourceId) {
      fetchSourceAndArticles();
    }
  }, [sourceId]);

  const fetchSourceAndArticles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch source info
      const sourceResponse = await fetch('/api/admin/sources');
      const sourceData = await sourceResponse.json();

      if (sourceResponse.ok) {
        const foundSource = sourceData.sources?.find((s: Source) => s.id === sourceId);
        if (foundSource) {
          setSource(foundSource);
        } else {
          setError('Source non trovato');
          return;
        }
      }

      // Fetch contenuti for this source
      const contenutiResponse = await fetch(`/api/admin/sources/${sourceId}/articles`);
      const contenutiData = await contenutiResponse.json();

      if (contenutiResponse.ok) {
        // Ordina i contenuti dal più recente al più vecchio
        const sortedContenuti = (contenutiData.contenuti || []).sort((a: Contenuto, b: Contenuto) => {
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        });
        setContenuti(sortedContenuti);
      } else {
        console.error('Error fetching contenuti:', contenutiData.error);
        setContenuti([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Errore durante il caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchNew = async () => {
    try {
      const response = await fetch(`/api/admin/sources/${sourceId}/fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true }),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchSourceAndArticles(); // Refresh the contenuti
        alert(`Fetch completato! Recuperati ${data.fetchedItems || 0} contenuti, di cui ${data.newItems || 0} nuovi.`);
      } else {
        alert('Errore durante il fetch: ' + data.error);
      }
    } catch (error) {
      console.error('Error fetching from source:', error);
      alert('Errore durante il fetch del feed');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT');
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento contenuti...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Errore</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Torna indietro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/admin/sources')}
                className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
              >
                ← Torna alle Sources
              </button>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Contenuti da {source?.name}
              </h1>
              {source?.url && (
                <p className="text-gray-600 mb-2">{source.url}</p>
              )}
              <div className="flex items-center space-x-4">
                <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                  source?.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : source?.status === 'paused'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {source?.status}
                </span>
                <span className="text-gray-500">
                  {contenuti.length} contenuti totali
                </span>
              </div>
            </div>
            <button
              onClick={handleFetchNew}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              🔄 Fetch Nuovi Contenuti
            </button>
          </div>
        </div>

        {/* Contenuti List */}
        {contenuti.length > 0 ? (
          <div className="grid gap-6">
            {contenuti.map((contenuto) => (
              <div key={contenuto.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {contenuto.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Pubblicato: {formatDate(contenuto.publishedAt)}</span>
                      <span>Recuperato: {formatDate(contenuto.fetchedAt)}</span>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        contenuto.processed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {contenuto.processed ? 'Processato' : 'Da processare'}
                      </span>
                      {contenuto.articleId && (
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          Articolo generato
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {contenuto.url && (
                  <div className="mb-2">
                    <a
                      href={contenuto.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      🔗 Link originale
                    </a>
                  </div>
                )}

                <div className="prose max-w-none">
                  <div className="text-gray-700 line-clamp-3">
                    {contenuto.content.length > 300
                      ? `${contenuto.content.substring(0, 300)}...`
                      : contenuto.content
                    }
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      ID: {contenuto.id}
                      {contenuto.guid && (
                        <span className="ml-2">GUID: {contenuto.guid.substring(0, 8)}...</span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(contenuto.content)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Copia Contenuto
                      </button>
                      <button
                        onClick={() => {
                          const blob = new Blob([contenuto.content], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${contenuto.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Download
                      </button>
                      {!contenuto.processed && (
                        <button
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                        >
                          Genera Articolo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun contenuto trovato</h3>
            <p className="text-gray-600 mb-6">
              Non sono ancora stati recuperati contenuti da questo source.
            </p>
            <button
              onClick={handleFetchNew}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              🔄 Recupera Contenuti
            </button>
          </div>
        )}
      </div>
    </div>
  );
}