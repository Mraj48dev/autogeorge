'use client';

import React from 'react';
import { useSiteContext } from '@/contexts/SiteContext';

export function SiteSelector() {
  const { currentSite, sites, isLoading, selectSite } = useSiteContext();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Caricamento...</span>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => window.location.href = '/admin/sites'}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Crea il tuo primo sito
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">🌐</span>
        <select
          value={currentSite?.id || ''}
          onChange={(e) => e.target.value && selectSite(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
        >
          <option value="">Seleziona sito...</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => window.location.href = '/admin/sites'}
        className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
        title="Gestisci siti"
      >
        ⚙️
      </button>
    </div>
  );
}