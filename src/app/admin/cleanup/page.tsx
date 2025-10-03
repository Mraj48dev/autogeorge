'use client';

import { useState } from 'react';

interface CleanupResults {
  total: number;
  fixed: number;
  skipped: number;
  errors: string[];
}

interface CorruptedArticle {
  id: string;
  title: string;
  createdAt: string;
  status: string;
  isCorrupted: {
    titleContainsJson: boolean;
    likelyJsonContent: boolean;
  };
}

export default function CleanupPage() {
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [results, setResults] = useState<CleanupResults | null>(null);
  const [preview, setPreview] = useState<CorruptedArticle[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = async () => {
    try {
      setPreviewing(true);
      setError(null);

      const response = await fetch('/api/admin/cleanup-corrupted-articles');
      const data = await response.json();

      if (data.success) {
        setPreview(data.articles || []);
      } else {
        throw new Error(data.error || 'Failed to load preview');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPreviewing(false);
    }
  };

  const runCleanup = async () => {
    if (!confirm('Are you sure you want to fix corrupted articles? This operation cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/cleanup-corrupted-articles', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        // Refresh preview after cleanup
        await loadPreview();
      } else {
        throw new Error(data.error || 'Cleanup failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🧹 Cleanup Articoli Corrotti
        </h1>
        <p className="text-gray-600">
          Ripara gli articoli che hanno JSON salvato nei campi title/content invece dei valori estratti.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">✅ Cleanup Completato</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{results.total}</div>
              <div className="text-sm text-gray-600">Articoli Analizzati</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{results.fixed}</div>
              <div className="text-sm text-gray-600">Articoli Riparati</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{results.skipped}</div>
              <div className="text-sm text-gray-600">Saltati</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{results.errors.length}</div>
              <div className="text-sm text-gray-600">Errori</div>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-red-800 mb-2">Errori:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {results.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={loadPreview}
          disabled={previewing}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {previewing ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Caricando...
            </div>
          ) : (
            '🔍 Anteprima Articoli Corrotti'
          )}
        </button>

        <button
          onClick={runCleanup}
          disabled={loading || preview.length === 0}
          className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Riparando...
            </div>
          ) : (
            '🔧 Ripara Articoli Corrotti'
          )}
        </button>
      </div>

      {/* Preview Table */}
      {preview.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              📋 Articoli Corrotti Trovati ({preview.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Article ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title Corrotto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo Corruzione
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {article.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {article.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        article.status === 'published' ? 'bg-green-100 text-green-800' :
                        article.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {article.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(article.createdAt).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="space-y-1">
                        {article.isCorrupted.titleContainsJson && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                            Title JSON
                          </span>
                        )}
                        {article.isCorrupted.likelyJsonContent && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                            Content JSON
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview.length === 0 && !previewing && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Nessun Articolo Corrotto</h3>
          <p className="text-gray-500">Clicca "Anteprima" per verificare o tutti gli articoli sono già stati riparati!</p>
        </div>
      )}
    </div>
  );
}