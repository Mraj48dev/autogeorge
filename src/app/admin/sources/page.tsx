'use client';

import { useState, useEffect } from 'react';

interface Source {
  id: string;
  name: string;
  type: string;
  url?: string;
  status: string;
  defaultCategory?: string;
  createdAt: string;
  configuration?: {
    maxItems?: number;
    pollingInterval?: number;
    enabled?: boolean;
    autoGenerate?: boolean;
  };
  metadata?: {
    totalFetches?: number;
    totalItems?: number;
    lastFetch?: {
      fetchedItems: number;
      newItems: number;
    };
  };
}

interface WordPressSite {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
}

interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  description: string;
}

interface CreateSourceRequest {
  name: string;
  type: string;
  url?: string;
  defaultCategory?: string;
  configuration?: {
    maxItems?: number;
    pollingInterval?: number;
    enabled?: boolean;
    autoGenerate?: boolean;
  };
  testConnection?: boolean;
}

export default function SourcesPage() {
  const [activeTab, setActiveTab] = useState('rss');
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<CreateSourceRequest>({
    name: '',
    type: 'rss',
    url: '',
    defaultCategory: '',
    configuration: {
      maxItems: 10,
      pollingInterval: 60,
      enabled: true,
      autoGenerate: false,
    },
    testConnection: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // WordPress data states
  const [wordpressSites, setWordpressSites] = useState<WordPressSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [wpCategories, setWpCategories] = useState<WordPressCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  useEffect(() => {
    fetchSources();
    loadWordPressSites();
  }, []);

  // Load WordPress categories when site is selected
  useEffect(() => {
    if (selectedSiteId) {
      loadWordPressCategories(selectedSiteId);
    }
  }, [selectedSiteId]);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sources');
      const data = await response.json();
      if (response.ok) {
        setSources(data.sources || []);
      } else {
        console.error('Error fetching sources:', data.error);
      }
    } catch (error) {
      console.error('Error fetching sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWordPressSites = async () => {
    try {
      const response = await fetch('/api/admin/sites');
      if (response.ok) {
        const data = await response.json();
        const sitesData = data.sites || [];
        setWordpressSites(sitesData);

        // Auto-select the first site if there's only one
        if (sitesData.length === 1) {
          setSelectedSiteId(sitesData[0].id);
        } else if (sitesData.length > 0) {
          // Select the first active site
          const activeSite = sitesData.find((site: WordPressSite) => site.id) || sitesData[0];
          setSelectedSiteId(activeSite.id);
        }
      }
    } catch (error) {
      console.error('Error loading WordPress sites:', error);
    }
  };

  const loadWordPressCategories = async (siteId: string) => {
    setCategoriesLoading(true);
    setCategoriesError(null);

    try {
      const response = await fetch(`/api/admin/wordpress/${siteId}/categories`);
      if (response.ok) {
        const data = await response.json();
        setWpCategories(data.categories || []);
      } else {
        const errorData = await response.json();
        setCategoriesError(errorData.error || 'Errore nel caricamento categorie');
        console.error('Error loading WordPress categories:', errorData);
      }
    } catch (error) {
      setCategoriesError('Errore di connessione nel caricamento categorie');
      console.error('Error loading WordPress categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingSource ? `/api/admin/sources/${editingSource.id}` : '/api/admin/sources';
      const method = editingSource ? 'PUT' : 'POST';

      console.log(`🌐 [Frontend] ${method} ${url}`, {
        formData,
        hasAutoGenerate: formData.configuration?.autoGenerate,
        configurationKeys: formData.configuration ? Object.keys(formData.configuration) : []
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      console.log(`📡 [Frontend] Response:`, {
        status: response.status,
        ok: response.ok,
        data,
        sourceReturned: data.source,
        autoGenerateInResponse: data.source?.configuration?.autoGenerate
      });

      if (response.ok) {
        console.log(`✅ [Frontend] Source saved successfully`);
        await fetchSources();
        setShowModal(false);
        setEditingSource(null);
        // Solo resetta il form per nuove creazioni, non per modifiche
        if (!editingSource) {
          setFormData({
            name: '',
            type: activeTab,
            url: '',
            defaultCategory: '',
            configuration: {
              maxItems: 10,
              pollingInterval: 60,
              enabled: true,
              autoGenerate: false,
            },
            testConnection: true,
          });
        }
      } else {
        console.error(`❌ [Frontend] Save failed:`, { status: response.status, data });
        alert('Errore: ' + data.error);
      }
    } catch (error) {
      console.error('💥 [Frontend] Exception during save:', error);
      alert(`Errore durante ${editingSource ? 'l\'aggiornamento' : 'la creazione'} della fonte`);
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (type: string) => {
    setEditingSource(null);
    setFormData({
      name: '',
      type,
      url: '',
      defaultCategory: '',
      configuration: {
        maxItems: 10,
        pollingInterval: 60,
        enabled: true,
        autoGenerate: false,
      },
      testConnection: true,
    });
    // Reset categories error when opening modal
    setCategoriesError(null);
    setShowModal(true);
  };

  const openEditModal = (source: Source) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      type: source.type,
      url: source.url || '',
      defaultCategory: source.defaultCategory || '',
      configuration: {
        maxItems: source.configuration?.maxItems || 10,
        pollingInterval: source.configuration?.pollingInterval || 60,
        enabled: source.configuration?.enabled ?? true,
        autoGenerate: source.configuration?.autoGenerate ?? false,
      },
      testConnection: false,
    });
    // Reset categories error when opening modal
    setCategoriesError(null);
    setShowModal(true);
  };

  const handleFetchFromSource = async (sourceId: string) => {
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
        await fetchSources();
        alert(`Fetch completato! Recuperati ${data.fetchedItems || 0} articoli, di cui ${data.newItems || 0} nuovi.`);
      } else {
        alert('Errore durante il fetch: ' + data.error);
      }
    } catch (error) {
      console.error('Error fetching from source:', error);
      alert('Errore durante il fetch del feed');
    }
  };

  const toggleSourceStatus = async (sourceId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    try {
      const response = await fetch(`/api/admin/sources/${sourceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchSources();
      } else {
        const data = await response.json();
        alert('Errore: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating source status:', error);
      alert('Errore durante l\'aggiornamento dello stato');
    }
  };

  const deleteSource = async (sourceId: string, sourceName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare la source "${sourceName}"? Questa azione non può essere annullata.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/sources/${sourceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await fetchSources();
        alert(`Source "${sourceName}" eliminata con successo!`);
      } else {
        const data = await response.json();
        alert('Errore durante l\'eliminazione: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting source:', error);
      alert('Errore durante l\'eliminazione della source');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Gestione Sources
        </h1>
        <p className="text-gray-600">
          Configura le fonti di contenuto per la generazione automatica
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('rss')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rss'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Feed RSS
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'telegram'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Telegram
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'calendar'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Calendario Editoriale
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'rss' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Feed RSS</h3>
            <button
              onClick={() => openModal('rss')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Aggiungi Feed
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Caricamento...</p>
            </div>
          ) : sources.filter(s => s.type === 'rss').length > 0 ? (
            <div className="space-y-4">
              {sources.filter(s => s.type === 'rss').map((source) => (
                <div key={source.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{source.name}</h4>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          source.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : source.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {source.status}
                        </span>
                      </div>
                      {source.url && (
                        <p className="text-sm text-gray-600 mb-2">{source.url}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>Max articoli: {source.configuration?.maxItems || 10}</span>
                        {source.defaultCategory && (
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            Categoria: {source.defaultCategory}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          source.configuration?.autoGenerate
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          Auto-generazione: {source.configuration?.autoGenerate ? 'Attiva' : 'Manuale'}
                        </span>
                        {source.metadata?.totalFetches && (
                          <span>Fetch totali: {source.metadata.totalFetches}</span>
                        )}
                        {source.metadata?.totalItems && (
                          <span>Articoli recuperati: {source.metadata.totalItems}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className="text-sm text-gray-500">
                        {new Date(source.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEditModal(source)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleFetchFromSource(source.id)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                        >
                          Fetch
                        </button>
                        <button
                          onClick={() => window.open(`/admin/sources/${source.id}/contents`, '_blank')}
                          className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                        >
                          Contenuti
                        </button>
                        <button
                          onClick={() => toggleSourceStatus(source.id, source.status)}
                          className={`px-3 py-1 text-sm rounded transition-colors ${
                            source.status === 'active'
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {source.status === 'active' ? 'Pausa' : 'Attiva'}
                        </button>
                        <button
                          onClick={() => deleteSource(source.id, source.name)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Elimina
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Nessun feed RSS configurato</h4>
              <p className="text-gray-600 mb-6">
                Aggiungi feed RSS per generare automaticamente articoli dai contenuti delle tue fonti preferite
              </p>
              <button
                onClick={() => openModal('rss')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Configura primo feed
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'telegram' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Canali Telegram</h3>
            <button
              onClick={() => openModal('telegram')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Aggiungi Canale
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Caricamento...</p>
            </div>
          ) : sources.filter(s => s.type === 'telegram').length > 0 ? (
            <div className="space-y-4">
              {sources.filter(s => s.type === 'telegram').map((source) => (
                <div key={source.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{source.name}</h4>
                      {source.url && (
                        <p className="text-sm text-gray-600 mt-1">{source.url}</p>
                      )}
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                        source.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {source.status}
                      </span>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className="text-sm text-gray-500">
                        {new Date(source.createdAt).toLocaleDateString()}
                      </div>
                      <button
                        onClick={() => deleteSource(source.id, source.name)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Nessun canale Telegram connesso</h4>
              <p className="text-gray-600 mb-6">
                Collega canali Telegram per monitorare contenuti e generare articoli dai post più interessanti
              </p>
              <button
                onClick={() => openModal('telegram')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connetti primo canale
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Calendario Editoriale</h3>
            <button
              onClick={() => openModal('calendar')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Programma Articolo
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Caricamento...</p>
            </div>
          ) : sources.filter(s => s.type === 'calendar').length > 0 ? (
            <div className="space-y-4">
              {sources.filter(s => s.type === 'calendar').map((source) => (
                <div key={source.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{source.name}</h4>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                        source.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {source.status}
                      </span>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className="text-sm text-gray-500">
                        {new Date(source.createdAt).toLocaleDateString()}
                      </div>
                      <button
                        onClick={() => deleteSource(source.id, source.name)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Calendario vuoto</h4>
              <p className="text-gray-600 mb-6">
                Programma la generazione automatica di articoli in date specifiche con argomenti predefiniti
              </p>
              <button
                onClick={() => openModal('calendar')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Programma primo articolo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Setup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-semibold text-blue-900">Feed RSS</h3>
          </div>
          <p className="text-blue-700 mb-4">
            Monitora automaticamente blog e siti web per nuovi contenuti
          </p>
          <button
            onClick={() => openModal('rss')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Configura RSS →
          </button>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-green-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-semibold text-green-900">Telegram</h3>
          </div>
          <p className="text-green-700 mb-4">
            Integra canali Telegram per contenuti real-time e trend
          </p>
          <button
            onClick={() => openModal('telegram')}
            className="text-green-600 hover:text-green-800 font-medium"
          >
            Connetti Telegram →
          </button>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-semibold text-purple-900">Calendario</h3>
          </div>
          <p className="text-purple-700 mb-4">
            Pianifica contenuti con date e argomenti predefiniti
          </p>
          <button
            onClick={() => openModal('calendar')}
            className="text-purple-600 hover:text-purple-800 font-medium"
          >
            Pianifica Contenuti →
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingSource ? (
                    `Modifica ${formData.type === 'rss' ? 'Feed RSS' : formData.type === 'telegram' ? 'Canale Telegram' : 'Calendario'}`
                  ) : (
                    <>
                      {formData.type === 'rss' && 'Aggiungi Feed RSS'}
                      {formData.type === 'telegram' && 'Aggiungi Canale Telegram'}
                      {formData.type === 'calendar' && 'Programma Articolo'}
                    </>
                  )}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Nome del ${formData.type === 'rss' ? 'feed' : formData.type === 'telegram' ? 'canale' : 'progetto'}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria di pubblicazione (opzionale)
                  </label>

                  {/* WordPress Site Selector */}
                  {wordpressSites.length > 1 && (
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Sito WordPress
                      </label>
                      <select
                        value={selectedSiteId}
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Seleziona sito...</option>
                        {wordpressSites.map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.name} ({site.url})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Categories Dropdown */}
                  {selectedSiteId ? (
                    <div>
                      {categoriesLoading ? (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          <span className="text-gray-500 text-sm">Caricamento categorie...</span>
                        </div>
                      ) : categoriesError ? (
                        <div>
                          <div className="w-full px-3 py-2 border border-red-300 rounded-lg bg-red-50 text-red-700 text-sm mb-2">
                            ⚠️ {categoriesError}
                          </div>
                          <input
                            type="text"
                            value={formData.defaultCategory || ''}
                            onChange={(e) => setFormData({ ...formData, defaultCategory: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Inserisci manualmente (es. Tecnologia, Sport...)"
                          />
                        </div>
                      ) : (
                        <select
                          value={formData.defaultCategory || ''}
                          onChange={(e) => setFormData({ ...formData, defaultCategory: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Nessuna categoria specifica</option>
                          {wpCategories.map((category) => (
                            <option key={category.id} value={category.name}>
                              {category.name} ({category.count} articoli)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ) : (
                    <div>
                      {wordpressSites.length === 0 ? (
                        <div className="w-full px-3 py-2 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-700 text-sm mb-2">
                          ⚠️ Nessun sito WordPress configurato. Configura prima un sito nelle impostazioni.
                        </div>
                      ) : (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                          Seleziona un sito WordPress per vedere le categorie disponibili
                        </div>
                      )}
                      <input
                        type="text"
                        value={formData.defaultCategory || ''}
                        onChange={(e) => setFormData({ ...formData, defaultCategory: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mt-2"
                        placeholder="Oppure inserisci manualmente (es. Tecnologia, Sport...)"
                      />
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    {selectedSiteId && !categoriesError ? (
                      <>Seleziona una categoria esistente dal tuo sito WordPress o lascia vuoto per nessuna categoria</>
                    ) : (
                      <>Specifica la categoria predefinita in cui verranno pubblicati gli articoli generati da questa fonte</>
                    )}
                  </p>
                </div>

                {(formData.type === 'rss' || formData.type === 'telegram') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.type === 'rss' ? 'URL del Feed' : 'URL del Canale'}
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={formData.type === 'rss' ? 'https://example.com/feed.xml' : 'https://t.me/channelname'}
                    />
                  </div>
                )}

                {formData.type === 'rss' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Numero massimo di articoli da recuperare
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.configuration?.maxItems || 10}
                        onChange={(e) => setFormData({
                          ...formData,
                          configuration: {
                            ...formData.configuration,
                            maxItems: parseInt(e.target.value) || 10
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="10"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Massimo 100 articoli per fetch. Consigliato: 10-20 per feed nuovi.
                      </p>
                    </div>

                  </>
                )}

                <div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="autoGenerate"
                      checked={formData.configuration?.autoGenerate || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        configuration: {
                          ...formData.configuration,
                          autoGenerate: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="autoGenerate" className="ml-2 block text-sm font-medium text-gray-700">
                      Auto-generazione articoli
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Se attivo, genera automaticamente articoli dai nuovi contenuti rilevati
                  </p>
                </div>

                {formData.type !== 'calendar' && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="testConnection"
                      checked={formData.testConnection}
                      onChange={(e) => setFormData({ ...formData, testConnection: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="testConnection" className="ml-2 block text-sm text-gray-700">
                      Testa connessione durante la creazione
                    </label>
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (editingSource ? 'Aggiornamento...' : 'Creazione...') : (editingSource ? 'Aggiorna' : 'Crea')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}