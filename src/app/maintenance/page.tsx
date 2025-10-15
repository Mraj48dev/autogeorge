export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">🔒</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              🚧 AutoGeorge in Manutenzione
            </h1>
            <p className="text-gray-600">
              Sistema temporaneamente non disponibile
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm font-medium text-amber-800">
                🔄 MIGRAZIONE SICUREZZA IN CORSO
              </span>
            </div>
            <ul className="text-xs text-amber-700 space-y-1 text-left">
              <li>✅ Rimosso NextAuth vulnerabile</li>
              <li>🔄 Installazione Clerk.com enterprise</li>
              <li>⏳ Configurazione API keys</li>
              <li>🎯 Test sicurezza finale</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              <p><strong>Nuovo sistema auth:</strong></p>
              <p className="text-xs">Clerk.com - Enterprise Grade Security</p>
            </div>

            <div className="text-xs text-gray-400">
              <p>⚡ Zero vulnerabilità</p>
              <p>🔐 Email verification automatica</p>
              <p>🛡️ Rate limiting integrato</p>
              <p>📱 Multi-factor authentication</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Sistema tornerà online al completamento migrazione
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
