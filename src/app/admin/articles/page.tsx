'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ArticleSummary {
  id: string;
  title: string;
  excerpt: string;
  status: string;
  wordCount: number;
  estimatedReadingTime: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  sourceId?: string;
  sourceName?: string;
}

interface SourceArticleGroup {
  sourceId: string;
  sourceName: string;
  articles: ArticleSummary[];
  totalCount: number;
  statusCounts: {
    draft: number;
    generated: number;
    ready_to_publish: number;
    published: number;
    failed: number;
  };
}

interface ArticlesBySourceResponse {
  articlesBySource: Record<string, SourceArticleGroup>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    totalArticles: number;
    totalSources: number;
    statusCounts: {
      draft: number;
      generated: number;
      ready_to_publish: number;
      published: number;
      failed: number;
    };
    mostActiveSource: string | null;
  };
}

export default function ArticlesBySourcePage() {
  const [data, setData] = useState<ArticlesBySourceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleSummary | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    sourceId: '',
    dateFrom: '',
    dateTo: ''
  });
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadArticlesBySource();
  }, [filters]);

  const loadArticlesBySource = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.sourceId) params.append('sourceId', filters.sourceId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      params.append('limit', '50');
      params.append('offset', '0');

      const response = await fetch(`/api/admin/articles-by-source?${params}`);

      if (!response.ok) {
        throw new Error('Errore durante il caricamento degli articoli');
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        // Auto-expand sources with articles
        const sourcesWithArticles = new Set(
          Object.keys(result.data.articlesBySource).filter(
            sourceId => result.data.articlesBySource[sourceId].articles.length > 0
          )
        );
        setExpandedSources(sourcesWithArticles);
      } else {
        throw new Error(result.error || 'Errore sconosciuto');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il caricamento');
      console.error('Error loading articles by source:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSourceExpansion = (sourceId: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId);
    } else {
      newExpanded.add(sourceId);
    }
    setExpandedSources(newExpanded);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated':
        return 'bg-green-100 text-green-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      case 'ready_to_publish':
        return 'bg-purple-100 text-purple-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'generated':
        return 'Generato';
      case 'published':
        return 'Pubblicato';
      case 'ready_to_publish':
        return 'Pronto per pubblicazione';
      case 'draft':
        return 'Bozza';
      case 'failed':
        return 'Fallito';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-medium text-red-800">Errore</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadArticlesBySource}
              className="mt-2 text-red-800 underline hover:text-red-900"
            >
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div>Nessun dato disponibile</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Articoli per Fonte
          </h1>
          <p className="text-gray-600">
            Gestisci tutti gli articoli raggruppati per fonte di origine
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/settings"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ⚙️ Impostazioni Prompt
          </Link>
          <Link
            href="/admin/generate"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Genera Nuovo
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Articoli Totali</p>
              <p className="text-xl font-bold text-gray-900">{data.summary.totalArticles}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Fonti Attive</p>
              <p className="text-xl font-bold text-green-600">{data.summary.totalSources}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Pubblicati</p>
              <p className="text-xl font-bold text-purple-600">{data.summary.statusCounts.published}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Generati</p>
              <p className="text-xl font-bold text-yellow-600">{data.summary.statusCounts.generated}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tutti gli stati</option>
              <option value="draft">Bozza</option>
              <option value="generated">Generato</option>
              <option value="ready_to_publish">Pronto per pubblicazione</option>
              <option value="published">Pubblicato</option>
              <option value="failed">Fallito</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data da</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data a</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', sourceId: '', dateFrom: '', dateTo: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancella Filtri
            </button>
          </div>
        </div>
      </div>

      {/* Articles by Source */}
      {Object.keys(data.articlesBySource).length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nessun articolo trovato
          </h3>
          <p className="text-gray-600 mb-6">
            Non sono stati trovati articoli con i filtri selezionati.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(data.articlesBySource).map(([sourceId, group]) => (
            <div key={sourceId} className="bg-white rounded-lg shadow-sm border">
              {/* Source Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSourceExpansion(sourceId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {expandedSources.has(sourceId) ? (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {group.sourceName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {group.totalCount} articoli totali
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Status counts */}
                    {group.statusCounts.generated > 0 && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded-full">
                        {group.statusCounts.generated} generati
                      </span>
                    )}
                    {group.statusCounts.published > 0 && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 text-xs font-medium rounded-full">
                        {group.statusCounts.published} pubblicati
                      </span>
                    )}
                    {group.statusCounts.failed > 0 && (
                      <span className="bg-red-100 text-red-800 px-2 py-1 text-xs font-medium rounded-full">
                        {group.statusCounts.failed} falliti
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Articles List */}
              {expandedSources.has(sourceId) && (
                <div className="border-t border-gray-200">
                  {group.articles.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      Nessun articolo trovato per questa fonte
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {group.articles.map((article) => (
                        <div key={article.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-md font-medium text-gray-900">
                                  {article.title}
                                </h4>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(article.status)}`}>
                                  {getStatusText(article.status)}
                                </span>
                              </div>

                              <p className="text-gray-600 mb-2 text-sm">
                                {article.excerpt}
                              </p>

                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>{formatDate(article.createdAt)}</span>
                                <span>{article.wordCount} parole</span>
                                <span>{article.estimatedReadingTime} min lettura</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => setSelectedArticle(article)}
                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Visualizza articolo"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Article Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setSelectedArticle(null)}>
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedArticle.title}
              </h2>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 flex items-center space-x-4 text-sm text-gray-600">
              <span>{formatDate(selectedArticle.createdAt)}</span>
              <span>{selectedArticle.wordCount} parole</span>
              <span>{selectedArticle.estimatedReadingTime} min lettura</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedArticle.status)}`}>
                {getStatusText(selectedArticle.status)}
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {selectedArticle.excerpt}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Chiudi
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Pubblica su WordPress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}