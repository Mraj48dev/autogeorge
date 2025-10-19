'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

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

export default function Sources() {
  const { user, isLoaded } = useUser();
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
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      fetchSources();
    }
  }, [isLoaded, user]);

  const fetchSources = async () => {
    try {
      setLoading(true);
      // TEMPORARY: Use test endpoint until Prisma cache is resolved
      const response = await fetch('/api/test-user-sources');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (formData.testConnection && !editingSource) {
        setTestingConnection(true);
      }

      // TEMPORARY: Use test endpoint for creation
      const url = editingSource ? `/api/user/sources/${editingSource.id}` : '/api/test-user-sources';
      const method = editingSource ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        if (formData.testConnection && !editingSource) {
          alert('✅ Fonte creata con successo!\n🔍 Test di connessione completato con successo.');
        }

        await fetchSources();
        setShowModal(false);
        setEditingSource(null);
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
        if (data.error?.includes('Source test failed') || data.error?.includes('not reachable')) {
          alert('❌ Test di connessione fallito!\n\n' + data.error + '\n\nVerifica URL e riprova, oppure disabilita il test di connessione.');
        } else {
          alert('Errore: ' + data.error);
        }
      }
    } catch (error) {
      console.error('Error during save:', error);
      alert(`Errore durante ${editingSource ? 'l\'aggiornamento' : 'la creazione'} della fonte`);
    } finally {
      setSubmitting(false);
      setTestingConnection(false);
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
    setShowModal(true);
  };

  const deleteSource = async (sourceId: string, sourceName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare la source "${sourceName}"? Questa azione non può essere annullata.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/user/sources/${sourceId}`, {
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

  if (!isLoaded) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
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
                  <input
                    type="text"
                    value={formData.defaultCategory || ''}
                    onChange={(e) => setFormData({ ...formData, defaultCategory: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="es. Tecnologia, Sport..."
                  />
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
                  <div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="testConnection"
                        checked={formData.testConnection}
                        onChange={(e) => setFormData({ ...formData, testConnection: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="testConnection" className="ml-2 block text-sm font-medium text-gray-700">
                        Testa connessione durante la creazione
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      {formData.testConnection ? (
                        <>🔍 Verificherà che il feed sia raggiungibile prima di salvare la fonte</>
                      ) : (
                        <>⚠️ La fonte verrà salvata senza verificare la connessione</>
                      )}
                    </p>
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {submitting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    )}
                    {submitting ? (
                      testingConnection ? (
                        'Testando connessione...'
                      ) : editingSource ? (
                        'Aggiornamento...'
                      ) : (
                        'Creazione...'
                      )
                    ) : (
                      editingSource ? 'Aggiorna' : 'Crea'
                    )}
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