export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="mt-6 text-6xl font-extrabold text-red-600">
            🚨
          </h1>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            SISTEMA IN MANUTENZIONE
          </h2>
          <p className="mt-2 text-lg text-gray-600">
            Stiamo implementando misure di sicurezza avanzate
          </p>
        </div>

        <div className="bg-red-100 border border-red-400 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-4">
            🔒 MOTIVO BLOCCO
          </h3>
          <div className="text-sm text-red-700 space-y-2">
            <p>• <strong>Vulnerabilità di sicurezza identificata</strong></p>
            <p>• <strong>Accesso non autorizzato possibile</strong></p>
            <p>• <strong>Sistema auth non sicuro</strong></p>
            <p>• <strong>Implementazione protezioni in corso</strong></p>
          </div>
        </div>

        <div className="bg-blue-100 border border-blue-400 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-800 mb-4">
            ⚡ COSA STIAMO FACENDO
          </h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>• <strong>Implementazione Clerk.com Auth</strong></p>
            <p>• <strong>Sistema sicurezza enterprise-grade</strong></p>
            <p>• <strong>Email verification blindato</strong></p>
            <p>• <strong>Multi-factor authentication</strong></p>
            <p>• <strong>Rate limiting e anti-bot</strong></p>
          </div>
        </div>

        <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-800 mb-4">
            ⏰ TEMPO STIMATO
          </h3>
          <div className="text-sm text-yellow-700 space-y-2">
            <p>• <strong>Setup Clerk.com:</strong> 30 minuti</p>
            <p>• <strong>Integrazione database:</strong> 15 minuti</p>
            <p>• <strong>Test sicurezza:</strong> 15 minuti</p>
            <p>• <strong>Deploy e verifica:</strong> 15 minuti</p>
            <p className="font-bold text-lg">TOTALE: ~75 minuti</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            AutoGeorge - Sicurezza al primo posto
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Grazie per la pazienza mentre rendiamo il sistema ultra-sicuro
          </p>
        </div>
      </div>
    </div>
  );
}