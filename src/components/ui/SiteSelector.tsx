'use client';

import React, { useState } from 'react';
import { ChevronDown, Plus, Globe } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useSiteContext } from '@/contexts/SiteContext';

export function SiteSelector() {
  const { currentSite, sites, isLoading, selectSite } = useSiteContext();
  const [open, setOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim() || !newSiteUrl.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSiteName.trim(),
          url: newSiteUrl.trim(),
          username: 'admin',
          password: 'password',
        }),
      });

      if (response.ok) {
        setNewSiteName('');
        setNewSiteUrl('');
        setShowCreateForm(false);
        window.location.reload(); // Refresh to load new site
      }
    } catch (error) {
      console.error('Failed to create site:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Globe className="h-4 w-4 text-gray-400 animate-spin" />
        <span className="text-sm text-gray-600">Caricamento...</span>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Crea il tuo primo sito
        </Button>

        {showCreateForm && (
          <div className="absolute top-16 left-0 bg-white shadow-lg border rounded-lg p-4 z-50 w-80">
            <h3 className="font-medium mb-3">Crea nuovo sito</h3>
            <form onSubmit={handleCreateSite} className="space-y-3">
              <div>
                <Label htmlFor="siteName">Nome del sito</Label>
                <Input
                  id="siteName"
                  placeholder="Il mio blog"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="siteUrl">URL del sito</Label>
                <Input
                  id="siteUrl"
                  placeholder="https://ilmioblog.com"
                  value={newSiteUrl}
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  required
                />
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creazione...' : 'Crea'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Annulla
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center space-x-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[200px] justify-between"
          >
            <div className="flex items-center">
              <Globe className="h-4 w-4 mr-2 text-gray-500" />
              <span className="truncate">
                {currentSite ? currentSite.name : "Seleziona sito..."}
              </span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-2">
          <div className="space-y-1">
            {sites.map((site) => (
              <button
                key={site.id}
                onClick={() => {
                  selectSite(site.id);
                  setOpen(false);
                }}
                className={`w-full text-left p-2 rounded hover:bg-gray-100 ${
                  currentSite?.id === site.id ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                <div className="font-medium text-sm">{site.name}</div>
                <div className="text-xs text-gray-500 truncate">{site.url}</div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.href = '/admin/sites'}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}