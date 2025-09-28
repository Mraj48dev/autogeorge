'use client';

import { useState, useEffect } from 'react';

interface GenerationConfig {
  prompts: {
    titlePrompt: string;
    contentPrompt: string;
    seoPrompt: string;
    imagePrompt: string;
  };
  modelSettings: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  languageSettings: {
    language: string;
    tone: string;
    style: string;
    targetAudience: string;
  };
}

interface WordPressSiteConfig {
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
  customFields?: any;
  isActive: boolean;
}

export default function SettingsPage() {
  const [generationSettings, setGenerationSettings] = useState<GenerationConfig | null>(null);
  const [wordPressSettings, setWordPressSettings] = useState<WordPressSiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingWordPress, setLoadingWordPress] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingWordPress, setSavingWordPress] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedWordPress, setSavedWordPress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorWordPress, setErrorWordPress] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadGenerationSettings();
    loadWordPressSettings();
  }, []);

  const loadGenerationSettings = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/admin/generation-settings', {
        headers: {
          'x-user-id': 'demo-user' // In a real app, this would come from auth
        }
      });

      if (!response.ok) {
        throw new Error('Errore durante il caricamento delle impostazioni');
      }

      const result = await response.json();

      if (result.success) {
        const settings = result.data.settings;
        // Ensure all required fields are present
        const completeSettings = {
          prompts: {
            titlePrompt: settings.prompts?.titlePrompt || 'Crea un titolo accattivante e SEO-friendly per questo articolo',
            contentPrompt: settings.prompts?.contentPrompt || 'Scrivi un articolo completo e ben strutturato',
            seoPrompt: settings.prompts?.seoPrompt || 'Includi meta description, tags e parole chiave SEO',
            imagePrompt: settings.prompts?.imagePrompt || 'Genera un\'immagine in evidenza per questo articolo'
          },
          modelSettings: {
            model: settings.modelSettings?.model || 'sonar-pro',
            temperature: settings.modelSettings?.temperature ?? 0.7,
            maxTokens: settings.modelSettings?.maxTokens || 2000
          },
          languageSettings: {
            language: settings.languageSettings?.language || 'it',
            tone: settings.languageSettings?.tone || 'professionale',
            style: settings.languageSettings?.style || 'giornalistico',
            targetAudience: settings.languageSettings?.targetAudience || 'generale'
          }
        };
        setGenerationSettings(completeSettings);
      } else {
        throw new Error(result.error || 'Errore sconosciuto');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il caricamento');
      console.error('Error loading generation settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWordPressSettings = async () => {
    try {
      setLoadingWordPress(true);

      const response = await fetch('/api/admin/wordpress-settings', {
        headers: {
          'x-user-id': 'demo-user' // In a real app, this would come from auth
        }
      });

      if (!response.ok) {
        throw new Error('Errore durante il caricamento delle impostazioni WordPress');
      }

      const result = await response.json();

      if (result.success) {
        if (result.data.site) {
          setWordPressSettings(result.data.site);
        } else {
          // Initialize with default values if no settings exist
          setWordPressSettings({
            name: '',
            url: '',
            username: '',
            password: '',
            defaultCategory: '',
            defaultStatus: 'draft',
            defaultAuthor: '',
            enableAutoPublish: false,
            enableFeaturedImage: true,
            enableTags: true,
            enableCategories: true,
            isActive: true
          });
        }
      } else {
        throw new Error(result.error || 'Errore sconosciuto');
      }
    } catch (err) {
      setErrorWordPress(err instanceof Error ? err.message : 'Errore durante il caricamento WordPress');
      console.error('Error loading WordPress settings:', err);
    } finally {
      setLoadingWordPress(false);
    }
  };

  const handleSave = async () => {
    if (!generationSettings) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/admin/generation-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user' // In a real app, this would come from auth
        },
        body: JSON.stringify({
          titlePrompt: generationSettings.prompts.titlePrompt,
          contentPrompt: generationSettings.prompts.contentPrompt,
          seoPrompt: generationSettings.prompts.seoPrompt,
          imagePrompt: generationSettings.prompts.imagePrompt,
          modelSettings: generationSettings.modelSettings,
          languageSettings: generationSettings.languageSettings
        })
      });

      if (!response.ok) {
        throw new Error('Errore durante il salvataggio delle impostazioni');
      }

      const result = await response.json();

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        throw new Error(result.error || 'Errore durante il salvataggio');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio');
      console.error('Error saving generation settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWordPress = async () => {
    if (!wordPressSettings) return;

    try {
      setSavingWordPress(true);
      setErrorWordPress(null);

      const response = await fetch('/api/admin/wordpress-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user' // In a real app, this would come from auth
        },
        body: JSON.stringify(wordPressSettings)
      });

      if (!response.ok) {
        throw new Error('Errore durante il salvataggio delle impostazioni WordPress');
      }

      const result = await response.json();

      if (result.success) {
        setSavedWordPress(true);
        setTimeout(() => setSavedWordPress(false), 3000);
        setWordPressSettings(result.data.site);
      } else {
        throw new Error(result.error || 'Errore durante il salvataggio');
      }
    } catch (err) {
      setErrorWordPress(err instanceof Error ? err.message : 'Errore durante il salvataggio WordPress');
      console.error('Error saving WordPress settings:', err);
    } finally {
      setSavingWordPress(false);
    }
  };

  const updateGenerationSettings = (updates: Partial<GenerationConfig>) => {
    if (!generationSettings) return;

    setGenerationSettings(prev => ({
      ...prev!,
      ...updates,
      prompts: { ...prev!.prompts, ...updates.prompts },
      modelSettings: { ...prev!.modelSettings, ...updates.modelSettings },
      languageSettings: { ...prev!.languageSettings, ...updates.languageSettings }
    }));
  };

  const updateWordPressSettings = (updates: Partial<WordPressSiteConfig>) => {
    if (!wordPressSettings) return;

    setWordPressSettings(prev => ({
      ...prev!,
      ...updates
    }));
  };

  if (loading || loadingWordPress) {
    return (
      <div className="max-w-4xl animate-pulse">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="space-y-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !generationSettings) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-medium text-red-800">Errore</h3>
              <p className="text-red-700">{error}</p>
              <button
                onClick={loadGenerationSettings}
                className="mt-2 text-red-800 underline hover:text-red-900"
              >
                Riprova
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!generationSettings) {
    return <div className="max-w-4xl">Nessun dato disponibile</div>;
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Impostazioni Sistema
        </h1>
        <p className="text-gray-600">
          Configura la generazione articoli e la pubblicazione su WordPress
        </p>
      </div>

      {/* Success Messages */}
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-800 font-medium">
              Impostazioni di generazione salvate con successo!
            </span>
          </div>
        </div>
      )}

      {savedWordPress && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-800 font-medium">
              Impostazioni WordPress salvate con successo!
            </span>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-800 font-medium">
              {error}
            </span>
          </div>
        </div>
      )}

      {errorWordPress && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-red-800 font-medium">
              {errorWordPress}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* WordPress Configuration */}
        {wordPressSettings && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Configurazione WordPress
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Configura il tuo sito WordPress per la pubblicazione automatica degli articoli
            </p>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Sito *
                  </label>
                  <input
                    type="text"
                    value={wordPressSettings.name}
                    onChange={(e) => updateWordPressSettings({ name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Il mio blog WordPress"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nome identificativo del tuo sito WordPress
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL Sito WordPress *
                  </label>
                  <input
                    type="url"
                    value={wordPressSettings.url}
                    onChange={(e) => updateWordPressSettings({ url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://miosito.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL completo del tuo sito WordPress
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username WordPress *
                  </label>
                  <input
                    type="text"
                    value={wordPressSettings.username}
                    onChange={(e) => updateWordPressSettings({ username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="admin"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Username per l'accesso a WordPress
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password WordPress *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={wordPressSettings.password}
                      onChange={(e) => updateWordPressSettings({ password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Password o Application Password per WordPress
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria Predefinita
                  </label>
                  <input
                    type="text"
                    value={wordPressSettings.defaultCategory || ''}
                    onChange={(e) => updateWordPressSettings({ defaultCategory: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Notizie, Blog, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Categoria di default per gli articoli pubblicati
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stato Predefinito
                  </label>
                  <select
                    value={wordPressSettings.defaultStatus}
                    onChange={(e) => updateWordPressSettings({ defaultStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="draft">Bozza</option>
                    <option value="publish">Pubblicato</option>
                    <option value="pending">In attesa di revisione</option>
                    <option value="private">Privato</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Stato di default per gli articoli creati
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Autore Predefinito
                </label>
                <input
                  type="text"
                  value={wordPressSettings.defaultAuthor || ''}
                  onChange={(e) => updateWordPressSettings({ defaultAuthor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nome dell'autore"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Autore di default per gli articoli (lascia vuoto per usare l'utente connesso)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Opzioni Pubblicazione</h4>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableAutoPublish"
                      checked={wordPressSettings.enableAutoPublish}
                      onChange={(e) => updateWordPressSettings({ enableAutoPublish: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableAutoPublish" className="ml-2 text-sm text-gray-700">
                      Pubblicazione automatica
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableFeaturedImage"
                      checked={wordPressSettings.enableFeaturedImage}
                      onChange={(e) => updateWordPressSettings({ enableFeaturedImage: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableFeaturedImage" className="ml-2 text-sm text-gray-700">
                      Immagine in evidenza automatica
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={wordPressSettings.isActive}
                      onChange={(e) => updateWordPressSettings({ isActive: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                      Configurazione attiva
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Metadati e SEO</h4>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableTags"
                      checked={wordPressSettings.enableTags}
                      onChange={(e) => updateWordPressSettings({ enableTags: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableTags" className="ml-2 text-sm text-gray-700">
                      Genera e applica tag automaticamente
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enableCategories"
                      checked={wordPressSettings.enableCategories}
                      onChange={(e) => updateWordPressSettings({ enableCategories: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableCategories" className="ml-2 text-sm text-gray-700">
                      Assegna categorie automaticamente
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* WordPress Save Button */}
            <div className="flex justify-end mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleSaveWordPress}
                disabled={savingWordPress}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingWordPress ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </div>
                ) : (
                  'Salva Configurazione WordPress'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Prompt Configuration */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Configurazione Prompt
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Personalizza i prompt utilizzati per generare titoli, contenuti e metadati SEO
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt per il Titolo
              </label>
              <textarea
                rows={3}
                value={generationSettings.prompts?.titlePrompt || ''}
                onChange={(e) => updateGenerationSettings({
                  prompts: { ...generationSettings.prompts, titlePrompt: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Prompt per generare titoli accattivanti..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Descrive come deve essere generato il titolo dell'articolo
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt per il Contenuto
              </label>
              <textarea
                rows={4}
                value={generationSettings.prompts?.contentPrompt || ''}
                onChange={(e) => updateGenerationSettings({
                  prompts: { ...generationSettings.prompts, contentPrompt: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Prompt per generare il corpo dell'articolo..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Descrive come deve essere strutturato e scritto il contenuto principale
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt per SEO e Metadata
              </label>
              <textarea
                rows={3}
                value={generationSettings.prompts?.seoPrompt || ''}
                onChange={(e) => updateGenerationSettings({
                  prompts: { ...generationSettings.prompts, seoPrompt: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Prompt per generare metadati SEO..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Descrive come generare meta description, tags e parole chiave
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt per Immagine in Evidenza
              </label>
              <textarea
                rows={3}
                value={generationSettings.prompts?.imagePrompt || ''}
                onChange={(e) => updateGenerationSettings({
                  prompts: { ...generationSettings.prompts, imagePrompt: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Genera un'immagine in evidenza per questo articolo..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Descrive come generare il comando AI per l'immagine in evidenza
              </p>
            </div>
          </div>
        </div>

        {/* Model Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Impostazioni Modello AI
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modello
              </label>
              <select
                value={generationSettings.modelSettings?.model || 'sonar-pro'}
                onChange={(e) => updateGenerationSettings({
                  modelSettings: { ...generationSettings.modelSettings, model: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="sonar-pro">Sonar Pro - Con ricerca web in tempo reale (Consigliato)</option>
                <option value="sonar">Sonar - Veloce per query semplici</option>
                <option value="llama-3.1-70b-instruct">Llama 3.1 70B - Modello grande per contenuti complessi</option>
                <option value="llama-3.1-8b-instruct">Llama 3.1 8B - Efficiente per contenuti basic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature (0-2)
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={generationSettings.modelSettings?.temperature ?? 0.7}
                onChange={(e) => updateGenerationSettings({
                  modelSettings: { ...generationSettings.modelSettings, temperature: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Creatività (0 = conservativo, 2 = creativo)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Token
              </label>
              <input
                type="number"
                min="100"
                max="8000"
                step="100"
                value={generationSettings.modelSettings?.maxTokens || 2000}
                onChange={(e) => updateGenerationSettings({
                  modelSettings: { ...generationSettings.modelSettings, maxTokens: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lunghezza massima dell'output
              </p>
            </div>
          </div>
        </div>

        {/* Language & Style Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Impostazioni Lingua e Stile
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lingua
              </label>
              <select
                value={generationSettings.languageSettings?.language || 'it'}
                onChange={(e) => updateGenerationSettings({
                  languageSettings: { ...generationSettings.languageSettings, language: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="it">Italiano</option>
                <option value="en">Inglese</option>
                <option value="es">Spagnolo</option>
                <option value="fr">Francese</option>
                <option value="de">Tedesco</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tono
              </label>
              <select
                value={generationSettings.languageSettings?.tone || 'professionale'}
                onChange={(e) => updateGenerationSettings({
                  languageSettings: { ...generationSettings.languageSettings, tone: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="professionale">Professionale</option>
                <option value="casuale">Casuale</option>
                <option value="formale">Formale</option>
                <option value="amichevole">Amichevole</option>
                <option value="autorevole">Autorevole</option>
                <option value="conversazionale">Conversazionale</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stile
              </label>
              <select
                value={generationSettings.languageSettings?.style || 'giornalistico'}
                onChange={(e) => updateGenerationSettings({
                  languageSettings: { ...generationSettings.languageSettings, style: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="giornalistico">Giornalistico</option>
                <option value="blog">Blog</option>
                <option value="accademico">Accademico</option>
                <option value="tecnico">Tecnico</option>
                <option value="marketing">Marketing</option>
                <option value="tutorial">Tutorial</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience
              </label>
              <select
                value={generationSettings.languageSettings?.targetAudience || 'generale'}
                onChange={(e) => updateGenerationSettings({
                  languageSettings: { ...generationSettings.languageSettings, targetAudience: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="generale">Generale</option>
                <option value="esperti">Esperti</option>
                <option value="principianti">Principianti</option>
                <option value="professionisti">Professionisti</option>
                <option value="studenti">Studenti</option>
                <option value="consumatori">Consumatori</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Anteprima Configurazione
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>Modello:</strong> {generationSettings.modelSettings?.model || 'Non configurato'}</p>
            <p><strong>Creatività:</strong> {generationSettings.modelSettings?.temperature ?? 0.7} / 2.0</p>
            <p><strong>Lingua:</strong> {(generationSettings.languageSettings?.language || 'it').toUpperCase()}</p>
            <p><strong>Stile:</strong> {generationSettings.languageSettings?.style || 'giornalistico'} - {generationSettings.languageSettings?.tone || 'professionale'}</p>
            <p><strong>Audience:</strong> {generationSettings.languageSettings?.targetAudience || 'generale'}</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={loadGenerationSettings}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            Ripristina
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </div>
            ) : (
              'Salva Impostazioni'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}