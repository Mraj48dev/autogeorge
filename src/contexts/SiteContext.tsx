'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';

export interface Site {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SiteContextType {
  currentSite: Site | null;
  sites: Site[];
  isLoading: boolean;
  error: string | null;
  selectSite: (siteId: string) => void;
  refreshSites: () => Promise<void>;
  createSite: (siteData: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Site>;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function useSiteContext() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error('useSiteContext must be used within a SiteProvider');
  }
  return context;
}

interface SiteProviderProps {
  children: ReactNode;
}

export function SiteProvider({ children }: SiteProviderProps) {
  const { isLoaded, isSignedIn } = useUser();
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSites = async (): Promise<Site[]> => {
    try {
      setError(null);
      const response = await fetch('/api/admin/sites');

      if (!response.ok) {
        throw new Error(`Failed to fetch sites: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch sites');
      }

      return data.sites || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching sites:', err);
      return [];
    }
  };

  const refreshSites = async () => {
    if (!isSignedIn) return;

    setIsLoading(true);
    try {
      const fetchedSites = await fetchSites();
      setSites(fetchedSites);

      // Auto-select first site if none selected and sites available
      if (!currentSite && fetchedSites.length > 0) {
        setCurrentSite(fetchedSites[0]);
        localStorage.setItem('selectedSiteId', fetchedSites[0].id);
      }

      // Verify current site still exists
      if (currentSite && !fetchedSites.find(s => s.id === currentSite.id)) {
        const newSelectedSite = fetchedSites[0] || null;
        setCurrentSite(newSelectedSite);
        if (newSelectedSite) {
          localStorage.setItem('selectedSiteId', newSelectedSite.id);
        } else {
          localStorage.removeItem('selectedSiteId');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectSite = (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    if (site) {
      setCurrentSite(site);
      localStorage.setItem('selectedSiteId', siteId);
    }
  };

  const createSite = async (siteData: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Promise<Site> => {
    try {
      setError(null);
      const response = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(siteData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create site: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create site');
      }

      const newSite = data.site;
      setSites(prevSites => [...prevSites, newSite]);

      // Auto-select the new site
      setCurrentSite(newSite);
      localStorage.setItem('selectedSiteId', newSite.id);

      return newSite;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    }
  };

  // Initialize sites and restore selected site from localStorage
  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setIsLoading(false);
      return;
    }

    const initializeSites = async () => {
      await refreshSites();

      // Try to restore previously selected site
      const savedSiteId = localStorage.getItem('selectedSiteId');
      if (savedSiteId && sites.length > 0) {
        const savedSite = sites.find(s => s.id === savedSiteId);
        if (savedSite) {
          setCurrentSite(savedSite);
        }
      }
    };

    initializeSites();
  }, [isLoaded, isSignedIn]);

  const contextValue: SiteContextType = {
    currentSite,
    sites,
    isLoading,
    error,
    selectSite,
    refreshSites,
    createSite,
  };

  return (
    <SiteContext.Provider value={contextValue}>
      {children}
    </SiteContext.Provider>
  );
}