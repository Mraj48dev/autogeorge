'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Article {
  id: string;
  title: string;
  content: string;
  status: string;
  sourceTitle?: string;
  sourceType?: string;
  createdAt: string;
  updatedAt: string;
  wordpressStatus?: string;
  publishedAt?: string;
  excerpt?: string;
}

const getStatusInfo = (status: string, wordpressStatus?: string) => {
  if (status === 'generated' && !wordpressStatus) {
    return {
      label: 'Generato (Non Pubblicato)',
      color: 'bg-blue-100 text-blue-800',
      icon: '📝'
    };
  }
  if (status === 'published' || wordpressStatus === 'publish') {
    return {
      label: 'Pubblicato',
      color: 'bg-green-100 text-green-800',
      icon: '✅'
    };
  }
  if (wordpressStatus === 'draft') {
    return {
      label: 'Bozza WordPress',
      color: 'bg-yellow-100 text-yellow-800',
      icon: '📄'
    };
  }
  return {
    label: 'In Elaborazione',
    color: 'bg-gray-100 text-gray-800',
    icon: '⏳'
  };
};

export default function Articles() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'generated' | 'published'>('all');

  useEffect(() => {
    const loadArticles = async () => {
      try {
        const response = await fetch('/api/admin/articles-by-source');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Estrai tutti gli articoli dalle fonti raggruppate
            const allArticles: Article[] = [];
            if (result.data.articlesBySource) {
              Object.values(result.data.articlesBySource).forEach((sourceGroup: any) => {
                if (sourceGroup.articles) {
                  allArticles.push(...sourceGroup.articles);
                }
              });
            }
            setArticles(allArticles);
          }
        }
      } catch (error) {
        console.error('Error loading articles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadArticles();
  }, [siteId]);

  const filteredArticles = articles.filter(article => {
    if (filter === 'generated') {
      return article.status === 'generated' && !article.wordpressStatus;
    }
    if (filter === 'published') {
      return article.status === 'published' || article.wordpressStatus === 'publish';
    }
    return true; // 'all'
  });

  const handleViewArticle = (articleId: string) => {
    // Implementa visualizzazione dettaglio articolo se necessario
    console.log('View article:', articleId);
  };

  const handleEditArticle = (articleId: string) => {
    // Implementa editing articolo se necessario
    console.log('Edit article:', articleId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Articoli</h1>
        <p className="text-gray-600">Visualizza e gestisci tutti i tuoi articoli generati</p>
      </div>

      {/* Filtri */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Tutti ({articles.length})
        </button>
        <button
          onClick={() => setFilter('generated')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'generated'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          📝 Generati ({articles.filter(a => a.status === 'generated' && !a.wordpressStatus).length})
        </button>
        <button
          onClick={() => setFilter('published')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            filter === 'published'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          ✅ Pubblicati ({articles.filter(a => a.status === 'published' || a.wordpressStatus === 'publish').length})
        </button>
      </div>

      {/* Lista Articoli */}
      {filteredArticles.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {filter === 'generated' && 'Nessun articolo generato'}
              {filter === 'published' && 'Nessun articolo pubblicato'}
              {filter === 'all' && 'Nessun articolo trovato'}
            </h2>
            <p className="text-gray-600 mb-4">
              {filter === 'generated' && 'Non hai ancora articoli generati dall\'AI.'}
              {filter === 'published' && 'Non hai ancora articoli pubblicati su WordPress.'}
              {filter === 'all' && 'Non ci sono ancora articoli per questo sito.'}
            </p>
            <button
              onClick={() => router.push(`/user/${siteId}/generate`)}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              ✨ Genera il tuo primo articolo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((article) => {
            const statusInfo = getStatusInfo(article.status, article.wordpressStatus);
            return (
              <div key={article.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                        {article.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {article.excerpt || truncateContent(article.content)}
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>📅 Creato: {formatDate(article.createdAt)}</span>
                      {article.publishedAt && (
                        <span>🌐 Pubblicato: {formatDate(article.publishedAt)}</span>
                      )}
                      {article.sourceTitle && (
                        <span>📡 Da: {article.sourceTitle}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewArticle(article.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      👁️ Visualizza
                    </button>
                    <button
                      onClick={() => handleEditArticle(article.id)}
                      className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                      ✏️ Modifica
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Statistiche */}
      {articles.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">📊 Statistiche Articoli</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{articles.length}</div>
              <div className="text-xs text-gray-600">Totale</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {articles.filter(a => a.status === 'generated' && !a.wordpressStatus).length}
              </div>
              <div className="text-xs text-gray-600">Generati</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {articles.filter(a => a.status === 'published' || a.wordpressStatus === 'publish').length}
              </div>
              <div className="text-xs text-gray-600">Pubblicati</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {articles.filter(a => a.wordpressStatus === 'draft').length}
              </div>
              <div className="text-xs text-gray-600">Bozze</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}