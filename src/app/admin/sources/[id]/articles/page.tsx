'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Article {
  id: string;
  title: string;
  content: string;
  status: string;
  sourceId: string;
  createdAt: string;
  updatedAt: string;
}

interface Source {
  id: string;
  name: string;
  type: string;
  url?: string;
  status: string;
}

export default function SourceArticlesPage() {
  const params = useParams();
  const router = useRouter();
  const sourceId = params.id as string;

  const [source, setSource] = useState<Source | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
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

      // Fetch articles for this source
      const articlesResponse = await fetch(`/api/admin/sources/${sourceId}/articles`);
      const articlesData = await articlesResponse.json();

      if (articlesResponse.ok) {
        // Ordina gli articoli dal più recente al più vecchio
        const sortedArticles = (articlesData.articles || []).sort((a: Article, b: Article) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setArticles(sortedArticles);
      } else {
        console.error('Error fetching articles:', articlesData.error);
        setArticles([]);
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
        await fetchSourceAndArticles(); // Refresh the articles
        alert(`Fetch completato! Recuperati ${data.fetchedItems || 0} articoli, di cui ${data.newItems || 0} nuovi.`);
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

  const getStatusBadge = (status: string) => {
    const statusColors = {
      generated: 'bg-blue-100 text-blue-800',
      published: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`inline-block px-2 py-1 text-xs rounded-full ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento articoli...</p>
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
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
              >
                ← Torna alle Sources
              </button>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Articoli da {source?.name}
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
                  {articles.length} articoli totali
                </span>
              </div>
            </div>
            <button
              onClick={handleFetchNew}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              🔄 Fetch Nuovi Articoli
            </button>
          </div>
        </div>

        {/* Articles List */}
        {articles.length > 0 ? (
          <div className="grid gap-6">
            {articles.map((article) => (
              <div key={article.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {article.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Creato: {formatDate(article.createdAt)}</span>
                      <span>Aggiornato: {formatDate(article.updatedAt)}</span>
                      {getStatusBadge(article.status)}
                    </div>
                  </div>
                </div>

                <div className="prose max-w-none">
                  <div className="text-gray-700 line-clamp-3">
                    {article.content.length > 300
                      ? `${article.content.substring(0, 300)}...`
                      : article.content
                    }
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      ID: {article.id}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(article.content)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Copia Contenuto
                      </button>
                      <button
                        onClick={() => {
                          const blob = new Blob([article.content], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${article.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
            <div className="text-gray-400 text-6xl mb-4">📰</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun articolo trovato</h3>
            <p className="text-gray-600 mb-6">
              Non sono ancora stati recuperati articoli da questo source.
            </p>
            <button
              onClick={handleFetchNew}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              🔄 Recupera Articoli
            </button>
          </div>
        )}
      </div>
    </div>
  );
}