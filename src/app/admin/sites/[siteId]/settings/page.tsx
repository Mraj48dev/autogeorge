'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Loader2, Save, ExternalLink } from 'lucide-react';

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
  enableAutoGeneration: boolean;
}

export default function SiteSettings() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Site>>({});

  useEffect(() => {
    fetchSite();
  }, [siteId]);

  const fetchSite = async () => {
    try {
      const response = await fetch('/api/admin/sites');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const foundSite = result.data.sites.find((s: any) => s.site.id === siteId);
          if (foundSite) {
            setSite(foundSite.site);
            setFormData(foundSite.site);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching site:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/sites/${siteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        alert('Impostazioni salvate con successo!');
        setSite(result.data.site);

        // Show connection test warnings if any
        if (result.data.connectionTest && result.data.connectionTest.warnings.length > 0) {
          alert(`Impostazioni salvate ma: ${result.data.connectionTest.warnings.join(', ')}`);
        }
      } else {
        throw new Error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Errore nel salvataggio delle impostazioni: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: keyof Site, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-900">Sito non trovato</h2>
        <p className="text-gray-600 mt-2">Il sito richiesto non esiste o non hai i permessi per accedervi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impostazioni Sito</h1>
        <p className="text-muted-foreground">
          Configura le impostazioni per {site.name}
        </p>
      </div>

      {/* Site Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Configurazione WordPress
          </CardTitle>
          <CardDescription>
            Impostazioni di connessione al sito WordPress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome Sito</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="Il mio blog"
              />
            </div>
            <div>
              <Label htmlFor="url">URL WordPress</Label>
              <Input
                id="url"
                value={formData.url || ''}
                onChange={(e) => updateFormData('url', e.target.value)}
                placeholder="https://miosito.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username || ''}
                onChange={(e) => updateFormData('username', e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <Label htmlFor="password">Password / Token</Label>
              <Input
                id="password"
                type="password"
                value={formData.password || ''}
                onChange={(e) => updateFormData('password', e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="defaultCategory">Categoria Predefinita</Label>
              <Input
                id="defaultCategory"
                value={formData.defaultCategory || ''}
                onChange={(e) => updateFormData('defaultCategory', e.target.value)}
                placeholder="generale"
              />
            </div>
            <div>
              <Label htmlFor="defaultAuthor">Autore Predefinito</Label>
              <Input
                id="defaultAuthor"
                value={formData.defaultAuthor || ''}
                onChange={(e) => updateFormData('defaultAuthor', e.target.value)}
                placeholder="AutoGeorge"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="defaultStatus">Stato Predefinito Articoli</Label>
            <Select
              value={formData.defaultStatus || 'draft'}
              onValueChange={(value) => updateFormData('defaultStatus', value)}
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
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Automazione</CardTitle>
          <CardDescription>
            Configura le funzionalità automatiche per questo sito
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.enableAutoGeneration || false}
                onChange={(e) => updateFormData('enableAutoGeneration', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Generazione automatica articoli</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.enableAutoPublish || false}
                onChange={(e) => updateFormData('enableAutoPublish', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Pubblicazione automatica</span>
            </label>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.enableFeaturedImage || false}
                onChange={(e) => updateFormData('enableFeaturedImage', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Immagini in evidenza</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.enableTags || false}
                onChange={(e) => updateFormData('enableTags', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Tags automatici</span>
            </label>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.enableCategories || false}
                onChange={(e) => updateFormData('enableCategories', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Categorie automatiche</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive || false}
                onChange={(e) => updateFormData('isActive', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Sito attivo</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salva Impostazioni
            </>
          )}
        </Button>
      </div>
    </div>
  );
}