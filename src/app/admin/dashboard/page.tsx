'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to sites selection - this page shouldn't be accessed directly
    router.replace('/admin/sites');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-2">Reindirizzamento...</h1>
        <p className="text-gray-600">Ti stiamo portando alla selezione dei siti</p>
      </div>
    </div>
  );
}