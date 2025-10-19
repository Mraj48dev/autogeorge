'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Plus, Globe, Trash2, Edit, ExternalLink } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UserSites() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isSignedIn) {
      fetchSites();
    }
  }, [isSignedIn]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sites');
      const result = await response.json();

      if (result.success && result.data?.sites) {
        // Transform the nested structure
        const transformedSites = result.data.sites.map((siteInfo: any) => ({
          id: siteInfo.site.id,
          name: siteInfo.site.name,
          url: siteInfo.site.url,
          isActive: siteInfo.site.isActive,
          createdAt: siteInfo.site.createdAt,
          updatedAt: siteInfo.site.updatedAt
        }));
        setSites(transformedSites);
      } else {
        setSites([]);
      }
    } catch (err) {
      console.error('Error fetching sites:', err);
      setSites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingSite ? `/api/admin/sites/${editingSite.id}` : '/api/admin/sites';
      const method = editingSite ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchSites();
        setShowCreateModal(false);
        setEditingSite(null);
        setFormData({ name: '', url: '', username: '', password: '', isActive: true });
      } else {
        const data = await response.json();
        alert('Errore: ' + (data.error || 'Operazione fallita'));
      }
    } catch (error) {
      console.error('Error submitting site:', error);
      alert('Errore durante l\'operazione');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSite = async (siteId: string, siteName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare il sito "${siteName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/sites/${siteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSites();
      } else {
        const data = await response.json();
        alert('Errore durante l\'eliminazione: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      alert('Errore durante l\'eliminazione');
    }
  };

  const openCreateModal = () => {
    setEditingSite(null);
    setFormData({ name: '', url: '', username: '', password: '', isActive: true });
    setShowCreateModal(true);
  };

  const openEditModal = (site: Site) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      url: site.url,
      username: '', // Don't pre-fill for security
      password: '', // Don't pre-fill for security
      isActive: site.isActive
    });
    setShowCreateModal(true);
  };

  const goToSiteManagement = (siteId: string) => {
    router.push(`/user/${siteId}/monitor`);
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">I Miei Siti</h1>
          <p className="mt-2 text-gray-600">Gestisci i tuoi siti WordPress collegati ad AutoGeorge</p>
        </div>

        {/* Sites Grid */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Siti Configurati</h2>
              <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Sito
              </Button>
            </div>
          </div>

          <div className="p-6">
            {sites.length === 0 ? (
              <div className="text-center py-12">
                <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun sito configurato</h3>
                <p className="text-gray-600 mb-6">
                  Aggiungi il tuo primo sito WordPress per iniziare con AutoGeorge
                </p>
                <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
                  Configura Primo Sito
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sites.map((site) => (
                  <Card key={site.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{site.name}</CardTitle>
                          <CardDescription className="flex items-center mt-2">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            <a
                              href={site.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 truncate"
                            >
                              {site.url}
                            </a>
                          </CardDescription>
                        </div>
                        <Badge variant={site.isActive ? "default" : "secondary"}>
                          {site.isActive ? 'Attivo' : 'Inattivo'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-500 mb-4">
                        <p>Creato: {new Date(site.createdAt).toLocaleDateString('it-IT')}</p>
                        <p>Aggiornato: {new Date(site.updatedAt).toLocaleDateString('it-IT')}</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => goToSiteManagement(site.id)}
                          className="flex-1 bg-gray-900 hover:bg-gray-800"
                        >
                          Gestisci
                        </Button>
                        <Button
                          onClick={() => openEditModal(site)}
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => deleteSite(site.id, site.name)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingSite ? 'Modifica Sito' : 'Aggiungi Nuovo Sito'}
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Chiudi</span>
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome del Sito
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="es. Il mio blog"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL del Sito
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://miosito.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username WordPress
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Admin username WordPress"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password WordPress
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Password admin WordPress"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Credenziali per accedere all'admin di WordPress
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-gray-700">
                        Sito attivo
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      variant="outline"
                    >
                      Annulla
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {submitting ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingSite ? 'Aggiornamento...' : 'Creazione...'}
                        </div>
                      ) : (
                        editingSite ? 'Aggiorna' : 'Crea Sito'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}