'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BUILD_INFO } from '@/lib/buildinfo';
import LiveClock from '@/components/LiveClock';

interface SitesLayoutProps {
  children: ReactNode;
}

export default function SitesLayout({ children }: SitesLayoutProps) {
  const pathname = usePathname();

  // Only apply this layout to the sites selection page, not site-specific pages
  const isSiteSpecificPage = pathname.includes('/admin/sites/') && pathname !== '/admin/sites';

  if (isSiteSpecificPage) {
    // For site-specific pages, let the [siteId]/layout.tsx handle everything
    return <>{children}</>;
  }

  // Complete layout for sites selection - NO SIDEBAR
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header only - no sidebar */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AG</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 ml-3">
                AutoGeorge - Seleziona Sito
              </h1>
            </div>
            <div className="text-sm text-gray-500">
              <div>v1.0.0</div>
              <LiveClock />
              <div className="text-xs">
                Deploy: {BUILD_INFO.buildTime}
              </div>
              <div className="text-xs text-gray-400">
                #{BUILD_INFO.commitHash}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content without sidebar */}
      <main className="w-full p-8 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}