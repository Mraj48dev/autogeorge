'use client';

import { useState, useEffect } from 'react';

interface GenerationConfig {
  prompts: {
    titlePrompt: string;
    contentPrompt: string;
    seoPrompt: string;
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

export default function SettingsPage() {
  const [generationSettings, setGenerationSettings] = useState<GenerationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGenerationSettings();
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
        setGenerationSettings(result.data.settings);
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

  if (loading) {
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
          Impostazioni Generazione Articoli
        </h1>
        <p className="text-gray-600">
          Configura i prompt e i parametri per la generazione automatica degli articoli
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

      {/* Error Message */}
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

      <div className="space-y-8">
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
                value={generationSettings.prompts.titlePrompt}
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
                value={generationSettings.prompts.contentPrompt}
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
                value={generationSettings.prompts.seoPrompt}
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
                value={generationSettings.modelSettings.model}
                onChange={(e) => updateGenerationSettings({
                  modelSettings: { ...generationSettings.modelSettings, model: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
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
                value={generationSettings.modelSettings.temperature}
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
                value={generationSettings.modelSettings.maxTokens}
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
                value={generationSettings.languageSettings.language}
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
                value={generationSettings.languageSettings.tone}
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
                value={generationSettings.languageSettings.style}
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
                value={generationSettings.languageSettings.targetAudience}
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
            <p><strong>Modello:</strong> {generationSettings.modelSettings.model}</p>
            <p><strong>Creatività:</strong> {generationSettings.modelSettings.temperature} / 2.0</p>
            <p><strong>Lingua:</strong> {generationSettings.languageSettings.language.toUpperCase()}</p>
            <p><strong>Stile:</strong> {generationSettings.languageSettings.style} - {generationSettings.languageSettings.tone}</p>
            <p><strong>Audience:</strong> {generationSettings.languageSettings.targetAudience}</p>
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