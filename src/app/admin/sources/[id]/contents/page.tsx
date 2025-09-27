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
  const [generatingArticles, setGeneratingArticles] = useState<Set<string>>(new Set());
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Contenuto | null>(null);
  const [customPrompts, setCustomPrompts] = useState({
    titlePrompt: '',
    contentPrompt: '',
    seoPrompt: ''
  });
  const [generateFeaturedImage, setGenerateFeaturedImage] = useState(false);

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
      const contenutiResponse = await fetch(`/api/admin/sources/${sourceId}/contents`);
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

  const handleGenerateArticle = async (contenuto: Contenuto, useCustomPrompts = false) => {
    try {
      setGeneratingArticles(prev => new Set(prev).add(contenuto.id));

      const payload = {
        feedItemId: contenuto.id,
        customPrompts: useCustomPrompts ? customPrompts : undefined,
        generateFeaturedImage: useCustomPrompts ? generateFeaturedImage : false
      };

      const response = await fetch('/api/admin/generate-article-manually', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Articolo generato con successo! Titolo: "${data.data.article.title}"`);
        // Refresh the contenuti to show updated processed status
        await fetchSourceAndArticles();

        // Close modal if open
        closePromptModal();
      } else {
        alert('Errore durante la generazione: ' + data.error);
      }
    } catch (error) {
      console.error('Error generating article:', error);
      alert('Errore durante la generazione dell\'articolo');
    } finally {
      setGeneratingArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(contenuto.id);
        return newSet;
      });
    }
  };

  const openPromptModal = (contenuto: Contenuto) => {
    setSelectedContent(contenuto);
    setShowPromptModal(true);
  };

  const closePromptModal = () => {
    setShowPromptModal(false);
    setSelectedContent(null);
    setCustomPrompts({ titlePrompt: '', contentPrompt: '', seoPrompt: '' });
    setGenerateFeaturedImage(false);
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
                      {!contenuto.processed && !contenuto.articleId && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleGenerateArticle(contenuto, false)}
                            disabled={generatingArticles.has(contenuto.id)}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingArticles.has(contenuto.id) ? 'Generando...' : 'Genera Articolo'}
                          </button>
                          <button
                            onClick={() => openPromptModal(contenuto)}
                            disabled={generatingArticles.has(contenuto.id)}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Custom
                          </button>
                        </div>
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

        {/* Custom Prompts Modal */}
        {showPromptModal && selectedContent && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={closePromptModal}>
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b pb-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Genera Articolo con Prompt Personalizzati
                </h2>
                <button
                  onClick={closePromptModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Contenuto da processare:</h3>
                <p className="text-gray-700 font-medium">{selectedContent.title}</p>
                <div className="bg-gray-50 p-3 rounded mt-2 max-h-32 overflow-y-auto">
                  <p className="text-sm text-gray-600">
                    {selectedContent.content.substring(0, 300)}...
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt per il Titolo (opzionale)
                  </label>
                  <textarea
                    value={customPrompts.titlePrompt}
                    onChange={(e) => setCustomPrompts(prev => ({ ...prev, titlePrompt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={2}
                    placeholder="Crea un titolo accattivante e SEO-friendly per questo articolo..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt per il Contenuto (opzionale)
                  </label>
                  <textarea
                    value={customPrompts.contentPrompt}
                    onChange={(e) => setCustomPrompts(prev => ({ ...prev, contentPrompt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                    placeholder="Scrivi un articolo completo e ben strutturato basato su questo contenuto..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt per SEO (opzionale)
                  </label>
                  <textarea
                    value={customPrompts.seoPrompt}
                    onChange={(e) => setCustomPrompts(prev => ({ ...prev, seoPrompt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={2}
                    placeholder="Includi meta description, tags pertinenti e parole chiave..."
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="generateFeaturedImage"
                      checked={generateFeaturedImage}
                      onChange={(e) => setGenerateFeaturedImage(e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="generateFeaturedImage" className="ml-2 block text-sm text-gray-700">
                      <span className="font-medium">Genera immagine in evidenza automaticamente</span>
                      <div className="text-xs text-gray-500 mt-1">
                        🖼️ Trova e carica automaticamente un'immagine pertinente su WordPress
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={closePromptModal}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={() => handleGenerateArticle(selectedContent, true)}
                  disabled={generatingArticles.has(selectedContent.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingArticles.has(selectedContent.id) ? 'Generando...' : 'Genera Articolo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}