'use client';

import { useState, useEffect } from 'react';

interface MonitorRecord {
  id: string;
  feedItemId: string;
  sourceId: string;
  sourceName: string;
  title: string;
  content: string;
  url?: string;
  publishedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  priority: 'high' | 'normal' | 'low';
  articleId?: string;
  generatedAt?: string;
  error?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  source: {
    id: string;
    name: string;
    type: string;
    url?: string;
    configuration: any;
  };
  feedItem: {
    id: string;
    guid?: string;
    fetchedAt: string;
    processed: boolean;
  };
}

interface MonitorData {
  monitors: MonitorRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats: {
    total: number;
    byStatus: Record<string, number>;
  };
}

export default function MonitorGenerationPage() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  // Carica i dati
  const loadData = async (status = 'all') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      params.set('limit', '100');

      const response = await fetch(`/api/admin/monitor-generation?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Genera articolo da un monitor record
  const generateArticle = async (monitorId: string) => {
    try {
      setGeneratingIds(prev => new Set([...prev, monitorId]));

      const response = await fetch(`/api/admin/monitor-generation/${monitorId}/generate`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      // Ricarica i dati per mostrare l'aggiornamento
      await loadData(selectedStatus);

      console.log('✅ Article generated successfully:', result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate article');
    } finally {
      setGeneratingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(monitorId);
        return newSet;
      });
    }
  };

  // Pulizia record completati/falliti
  const cleanupRecords = async (status: string, days: number = 7) => {
    try {
      const response = await fetch(`/api/admin/monitor-generation?status=${status}&days=${days}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      console.log(`🗑️ Cleaned up ${result.data.deleted} records`);
      await loadData(selectedStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cleanup records');
    }
  };

  // Effetto per caricare i dati iniziali
  useEffect(() => {
    loadData(selectedStatus);
  }, [selectedStatus]);

  // Status colors e styles
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'normal':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading && !data) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading monitor generation records...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monitor Generation</h1>
          <p className="text-gray-500 mt-1">
            Gestisci la coda di generazione articoli automatica
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData(selectedStatus)}
            disabled={loading}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => cleanupRecords('completed')}
            className="px-4 py-2 bg-red-50 border border-red-200 rounded-md shadow-sm text-sm font-medium text-red-700 hover:bg-red-100"
          >
            🗑️ Cleanup Completed
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-red-600 font-medium">⚠️ Error</div>
          </div>
          <div className="mt-1 text-red-600 text-sm">{error}</div>
        </div>
      )}

      {/* Stats Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-500">Total Records</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{data.stats.total}</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-500">Pending</div>
              <div className="text-yellow-500">⏳</div>
            </div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">{data.stats.byStatus['pending'] || 0}</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-500">Completed</div>
              <div className="text-green-500">✅</div>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-1">{data.stats.byStatus['completed'] || 0}</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-500">Errors</div>
              <div className="text-red-500">❌</div>
            </div>
            <div className="text-2xl font-bold text-red-600 mt-1">{data.stats.byStatus['error'] || 0}</div>
          </div>
        </div>
      )}

      {/* Tabs per Status */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['all', 'pending', 'processing', 'completed', 'error'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  selectedStatus === status
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : data && data.monitors.length > 0 ? (
            <div className="space-y-4">
              {data.monitors.map((monitor) => (
                <div key={monitor.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusClass(monitor.status)}`}>
                          {monitor.status === 'pending' && '⏳'}
                          {monitor.status === 'processing' && '⚡'}
                          {monitor.status === 'completed' && '✅'}
                          {monitor.status === 'error' && '❌'}
                          {monitor.status.charAt(0).toUpperCase() + monitor.status.slice(1)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityClass(monitor.priority)}`}>
                          {monitor.priority.charAt(0).toUpperCase() + monitor.priority.slice(1)}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                          {monitor.source.name}
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{monitor.title}</h3>
                      <p className="text-gray-600 text-sm mb-4">
                        {monitor.content.substring(0, 200)}
                        {monitor.content.length > 200 && '...'}
                      </p>
                      <div className="flex flex-col gap-2 text-sm text-gray-500">
                        <div className="flex justify-between">
                          <span>Created: {new Date(monitor.createdAt).toLocaleString()}</span>
                          <span>Published: {new Date(monitor.publishedAt).toLocaleString()}</span>
                        </div>
                        {monitor.generatedAt && (
                          <div>Generated: {new Date(monitor.generatedAt).toLocaleString()}</div>
                        )}
                        {monitor.error && (
                          <div className="bg-red-50 text-red-600 font-mono text-xs p-2 rounded border border-red-200">
                            {monitor.error}
                          </div>
                        )}
                        {monitor.url && (
                          <div>
                            <a href={monitor.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              🔗 Original URL
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {monitor.status === 'pending' && (
                        <button
                          onClick={() => generateArticle(monitor.id)}
                          disabled={generatingIds.has(monitor.id)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingIds.has(monitor.id) ? (
                            <>
                              <span className="animate-spin inline-block mr-1">⏳</span>
                              Generating...
                            </>
                          ) : (
                            <>
                              ▶️ Generate
                            </>
                          )}
                        </button>
                      )}
                      {monitor.articleId && (
                        <button
                          onClick={() => window.open(`/admin/articles/${monitor.articleId}`, '_blank')}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 border border-gray-300"
                        >
                          📄 View Article
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="text-gray-400 text-4xl mb-2">⏳</div>
              <p className="text-gray-600">No monitor generation records found</p>
              <p className="text-gray-500 text-sm mt-1">
                Records will appear here when RSS feeds with auto-generation enabled receive new content
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}