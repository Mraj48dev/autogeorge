'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Loader2, Plus, Settings, Trash2, ExternalLink, Activity, FileText, Rss, TrendingUp, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
// import { toast } from 'sonner';

interface SiteStatistics {
  totalSources: number;
  totalArticles: number;
  articlesPublished: number;
  articlesPending: number;
  isPublishing: boolean;
  lastPublishAt?: string;
  lastError?: string;
}

interface Site {
  id: string;
  userId: string;
  name: string;
  url: string;
  username: string;
  password: string;
  defaultCategory?: string;
  defaultStatus: string;
  defaultAuthor?: string;
  enableAutoPublish: boolean;
  enableFeaturedImage: boolean;
  enableTags: boolean;
  enableCategories: boolean;
  customFields?: Record<string, any>;
  isActive: boolean;
  lastPublishAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  enableAutoGeneration: boolean;
}

interface UserSiteInfo {
  site: Site;
  statistics: SiteStatistics;
}

interface CreateSiteFormData {
  name: string;
  url: string;
  username: string;
  password: string;
  defaultCategory: string;
  defaultStatus: string;
  defaultAuthor: string;
  enableAutoPublish: boolean;
  enableFeaturedImage: boolean;
  enableTags: boolean;
  enableCategories: boolean;
  enableAutoGeneration: boolean;
}

export default function SitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<UserSiteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateSiteFormData>({
    name: '',
    url: '',
    username: '',
    password: '',
    defaultCategory: '',
    defaultStatus: 'draft',
    defaultAuthor: '',
    enableAutoPublish: false,
    enableFeaturedImage: true,
    enableTags: true,
    enableCategories: true,
    enableAutoGeneration: false
  });

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/admin/sites');
      if (!response.ok) {
        throw new Error('Failed to fetch sites');
      }

      const result = await response.json();
      if (result.success) {
        setSites(result.data.sites);
      } else {
        throw new Error(result.error || 'Failed to fetch sites');
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      console.error('Errore nel caricamento dei siti');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleCreateSite = async () => {
    setCreateLoading(true);
    try {
      const response = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        alert('Sito creato con successo!');
        setShowCreateForm(false);
        setFormData({
          name: '',
          url: '',
          username: '',
          password: '',
          defaultCategory: '',
          defaultStatus: 'draft',
          defaultAuthor: '',
          enableAutoPublish: false,
          enableFeaturedImage: true,
          enableTags: true,
          enableCategories: true,
          enableAutoGeneration: false
        });
        fetchSites();

        // Show connection test warnings if any
        if (result.data.connectionTest && result.data.connectionTest.warnings.length > 0) {
          alert(`Sito creato ma: ${result.data.connectionTest.warnings.join(', ')}`);
        }
      } else {
        throw new Error(result.error || 'Failed to create site');
      }
    } catch (error) {
      console.error('Error creating site:', error);
      alert('Errore nella creazione del sito: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteSite = async (siteId: string, siteName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare il sito "${siteName}"? Questa operazione non può essere annullata.`)) {
      return;
    }

    setDeleteLoading(siteId);
    try {
      const response = await fetch(`/api/admin/sites/${siteId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        alert('Sito eliminato con successo!');
        fetchSites();
      } else {
        throw new Error(result.error || 'Failed to delete site');
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      alert('Errore nell\'eliminazione del sito');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleManageSite = (siteId: string) => {
    // Redirect to current admin with site context
    router.push(`/admin?siteId=${siteId}`);
  };

  const getSiteStatusBadge = (site: Site, stats: SiteStatistics) => {
    if (stats.isPublishing) {
      return <Badge variant="default" className="bg-blue-500"><Activity className="w-3 h-3 mr-1" />Pubblicando</Badge>;
    }
    if (site.lastError) {
      return <Badge variant="destructive">Errore</Badge>;
    }
    if (!site.isActive) {
      return <Badge variant="secondary">Inattivo</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Attivo</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">I Tuoi Siti</h1>
          <p className="text-muted-foreground">
            Gestisci i tuoi siti WordPress collegati ad AutoGeorge
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi Sito
        </Button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Aggiungi Nuovo Sito</CardTitle>
                <CardDescription>
                  Collega un nuovo sito WordPress per iniziare a generare contenuti automaticamente.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Sito</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Il mio blog"
                />
              </div>
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://miosito.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username WordPress</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="admin"
                />
              </div>
              <div>
                <Label htmlFor="password">Password WordPress</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="defaultStatus">Stato Predefinito Articoli</Label>
              <Select
                value={formData.defaultStatus}
                onValueChange={(value) => setFormData(prev => ({ ...prev, defaultStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Bozza</SelectItem>
                  <SelectItem value="publish">Pubblicato</SelectItem>
                  <SelectItem value="private">Privato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.enableAutoPublish}
                  onChange={(e) => setFormData(prev => ({ ...prev, enableAutoPublish: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Pubblicazione automatica</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.enableAutoGeneration}
                  onChange={(e) => setFormData(prev => ({ ...prev, enableAutoGeneration: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Generazione automatica</span>
              </label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateSite} disabled={createLoading}>
                {createLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crea Sito
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Annulla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Nessun sito configurato</h3>
              <p className="text-muted-foreground mb-4">
                Aggiungi il tuo primo sito WordPress per iniziare
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Primo Sito
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sites.map(({ site, statistics }) => (
            <Card key={site.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{site.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <ExternalLink className="w-3 h-3" />
                      <a href={site.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {site.url}
                      </a>
                    </CardDescription>
                  </div>
                  {getSiteStatusBadge(site, statistics)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Rss className="w-4 h-4 text-muted-foreground" />
                    <span>{statistics.totalSources} fonti</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span>{statistics.totalArticles} articoli</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span>{statistics.articlesPublished} pubblicati</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-orange-500" />
                    <span>{statistics.articlesPending} in attesa</span>
                  </div>
                </div>

                {site.lastError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <strong>Ultimo errore:</strong> {site.lastError}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleManageSite(site.id)}
                    className="flex-1"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Gestisci
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteLoading === site.id}
                    onClick={() => handleDeleteSite(site.id, site.name)}
                  >
                    {deleteLoading === site.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}