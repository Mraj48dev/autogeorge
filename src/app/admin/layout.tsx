import Link from 'next/link';
import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AG</span>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  AutoGeorge Admin
                </h1>
              </Link>
            </div>
            <div className="text-sm text-gray-500">
              <div>v1.0.0</div>
              <div className="text-xs">
                Deploy: {new Date().toLocaleString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="bg-white w-64 min-h-screen shadow-sm border-r">
          <div className="p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin/dashboard"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-blue-100 rounded flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">📊</span>
                  </div>
                  <span className="font-medium">Dashboard</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/generate"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-purple-100 rounded flex items-center justify-center">
                    <span className="text-purple-600 text-xs font-bold">✚</span>
                  </div>
                  <span className="font-medium">Genera Articolo</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/articles"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-green-100 rounded flex items-center justify-center">
                    <span className="text-green-600 text-xs font-bold">📄</span>
                  </div>
                  <span className="font-medium">Articoli</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/sources"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-indigo-100 rounded flex items-center justify-center">
                    <span className="text-indigo-600 text-xs font-bold">🔗</span>
                  </div>
                  <span className="font-medium">Sources</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/publishing"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-red-100 rounded flex items-center justify-center">
                    <span className="text-red-600 text-xs font-bold">📤</span>
                  </div>
                  <span className="font-medium">Publishing</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/settings"
                  className="flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-5 h-5 mr-3 bg-orange-100 rounded flex items-center justify-center">
                    <span className="text-orange-600 text-xs font-bold">⚙️</span>
                  </div>
                  <span className="font-medium">Impostazioni</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Health Status */}
          <div className="mt-auto p-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm text-green-700 font-medium">Sistema Online</span>
              </div>
              <div className="text-xs text-green-600 mt-1">
                Perplexity AI: Connesso
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-gray-50 min-h-screen">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}