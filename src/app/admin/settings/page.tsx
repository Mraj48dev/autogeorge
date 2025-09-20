'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    perplexityApiKey: 'pplx-**********************',
    openaiApiKey: '',
    defaultModel: 'sonar',
    defaultWordCount: 800,
    defaultTone: 'professional',
    defaultStyle: 'blog',
    autoPublish: false,
    wordpressUrl: '',
    wordpressUsername: '',
    wordpressPassword: '',
    enableNotifications: true,
    notificationEmail: 'admin@example.com'
  });

  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    // TODO: Implement save functionality
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Impostazioni Sistema
        </h1>
        <p className="text-gray-600">
          Configura AutoGeorge secondo le tue esigenze
        </p>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-800 font-medium">
              Impostazioni salvate con successo!
            </span>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* AI Configuration */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Configurazione AI
          </h3>

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Perplexity API Key
              </label>
              <div className="flex">
                <input
                  type="password"
                  value={settings.perplexityApiKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, perplexityApiKey: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="pplx-your-api-key"
                />
                <div className="px-3 py-2 bg-green-50 border-t border-b border-r border-green-200 rounded-r-lg">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Configurata e funzionante
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key (Opzionale)
              </label>
              <input
                type="password"
                value={settings.openaiApiKey}
                onChange={(e) => setSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="sk-your-openai-key"
              />
              <p className="text-xs text-gray-500 mt-1">
                Per accedere ai modelli GPT (opzionale)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modello Predefinito
                </label>
                <select
                  value={settings.defaultModel}
                  onChange={(e) => setSettings(prev => ({ ...prev, defaultModel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="sonar">Sonar</option>
                  <option value="sonar pro">Sonar Pro</option>
                  <option value="sonar reasoning">Sonar Reasoning</option>
                  <option value="sonar reasoning pro">Sonar Reasoning Pro</option>
                  <option value="sonar deep research">Sonar Deep Research</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lunghezza Predefinita (parole)
                </label>
                <input
                  type="number"
                  min="100"
                  max="3000"
                  value={settings.defaultWordCount}
                  onChange={(e) => setSettings(prev => ({ ...prev, defaultWordCount: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tono Predefinito
                </label>
                <select
                  value={settings.defaultTone}
                  onChange={(e) => setSettings(prev => ({ ...prev, defaultTone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="professional">Professionale</option>
                  <option value="casual">Casuale</option>
                  <option value="formal">Formale</option>
                  <option value="friendly">Amichevole</option>
                  <option value="authoritative">Autorevole</option>
                  <option value="conversational">Conversazionale</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stile Predefinito
                </label>
                <select
                  value={settings.defaultStyle}
                  onChange={(e) => setSettings(prev => ({ ...prev, defaultStyle: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="blog">Blog</option>
                  <option value="news">News</option>
                  <option value="academic">Accademico</option>
                  <option value="technical">Tecnico</option>
                  <option value="marketing">Marketing</option>
                  <option value="tutorial">Tutorial</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* WordPress Integration */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Integrazione WordPress
          </h3>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="autoPublish"
                type="checkbox"
                checked={settings.autoPublish}
                onChange={(e) => setSettings(prev => ({ ...prev, autoPublish: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoPublish" className="ml-2 block text-sm text-gray-900">
                Pubblicazione automatica su WordPress
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL WordPress
                </label>
                <input
                  type="url"
                  value={settings.wordpressUrl}
                  onChange={(e) => setSettings(prev => ({ ...prev, wordpressUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://tuosito.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username WordPress
                  </label>
                  <input
                    type="text"
                    value={settings.wordpressUsername}
                    onChange={(e) => setSettings(prev => ({ ...prev, wordpressUsername: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Application Password
                  </label>
                  <input
                    type="password"
                    value={settings.wordpressPassword}
                    onChange={(e) => setSettings(prev => ({ ...prev, wordpressPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="xxxx xxxx xxxx xxxx"
                  />
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.862-.833-2.632 0L4.182 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">
                    Nota sulla sicurezza
                  </h4>
                  <p className="text-sm text-yellow-700">
                    Usa Application Password invece della password normale per maggiore sicurezza.
                    Puoi crearla in WordPress → Utenti → Profilo → Application Passwords.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Notifiche
          </h3>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="enableNotifications"
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => setSettings(prev => ({ ...prev, enableNotifications: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enableNotifications" className="ml-2 block text-sm text-gray-900">
                Abilita notifiche email
              </label>
            </div>

            {settings.enableNotifications && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email per notifiche
                </label>
                <input
                  type="email"
                  value={settings.notificationEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, notificationEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="admin@tuodominio.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Riceverai notifiche per articoli generati, errori e aggiornamenti
                </p>
              </div>
            )}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Informazioni Sistema
          </h3>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Versione</h4>
              <p className="text-sm text-gray-900">AutoGeorge v1.0.0</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Ultimo Deploy</h4>
              <p className="text-sm text-gray-900">20 Gennaio 2024, 15:30</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Stato Database</h4>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm text-green-600">Connesso</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Stato AI</h4>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm text-green-600">Operativo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Salva Impostazioni
          </button>
        </div>
      </div>
    </div>
  );
}