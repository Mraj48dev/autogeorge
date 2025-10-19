'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface WordPressSiteSettings {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  defaultCategory: string;
  defaultStatus: string;
  enableAutoPublish: boolean;
  enableFeaturedImage: boolean;
  enableTags: boolean;
  enableCategories: boolean;
  enableAutoGeneration: boolean;
}

interface GenerationSettings {
  titlePrompt: string;
  contentPrompt: string;
  imagePrompt: string;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  defaultLanguage: string;
  defaultTone: string;
  defaultStyle: string;
  defaultTargetAudience: string;
  imageStyle: string;
  imageModel: string;
  imageSize: string;
  allowPromptEditing: boolean;
  enablePromptEngineering: boolean;
  imageGenerationMode: string;
  promptEngineeringModel: string;
}

export default function Settings() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteSettings, setSiteSettings] = useState<WordPressSiteSettings | null>(null);
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load site settings
        const siteResponse = await fetch('/api/admin/sites');
        if (siteResponse.ok) {
          const siteResult = await siteResponse.json();
          if (siteResult.success && siteResult.data?.sites) {
            const userSite = siteResult.data.sites.find((siteInfo: any) => siteInfo.site.id === siteId);
            if (userSite) {
              setSiteSettings(userSite.site);
            }
          }
        }

        // Load generation settings
        const genResponse = await fetch('/api/admin/generation-settings');
        if (genResponse.ok) {
          const genResult = await genResponse.json();
          if (genResult.success && genResult.data) {
            setGenerationSettings(genResult.data);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [siteId]);

  const handleSiteSettingsChange = (field: keyof WordPressSiteSettings, value: any) => {
    if (!siteSettings) return;
    setSiteSettings({ ...siteSettings, [field]: value });
  };

  const handleGenerationSettingsChange = (field: keyof GenerationSettings, value: any) => {
    if (!generationSettings) return;
    setGenerationSettings({ ...generationSettings, [field]: value });
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      let siteUpdateSuccess = false;
      let generationUpdateSuccess = false;

      // Save site settings
      if (siteSettings) {
        const siteResponse = await fetch(`/api/admin/sites/${siteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(siteSettings)
        });

        if (siteResponse.ok) {
          const result = await siteResponse.json();
          if (result.success) {
            siteUpdateSuccess = true;
            // Update local state with saved data
            setSiteSettings(result.data.site);
          }
        }
      }

      // Save generation settings
      if (generationSettings) {
        const genResponse = await fetch('/api/admin/generation-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generationSettings)
        });

        if (genResponse.ok) {
          const result = await genResponse.json();
          if (result.success) {
            generationUpdateSuccess = true;
            setGenerationSettings(result.data);
          }
        }
      }

      if (siteUpdateSuccess && generationUpdateSuccess) {
        alert('✅ Impostazioni salvate con successo!\n\nI cambiamenti si rifletteranno anche nella Dashboard.');
      } else if (siteUpdateSuccess) {
        alert('✅ Impostazioni sito salvate.\n⚠️ Errore nel salvataggio delle impostazioni AI.');
      } else if (generationUpdateSuccess) {
        alert('✅ Impostazioni AI salvate.\n⚠️ Errore nel salvataggio delle impostazioni sito.');
      } else {
        alert('❌ Errore nel salvataggio delle impostazioni');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('❌ Errore di connessione nel salvataggio delle impostazioni');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!siteSettings || !generationSettings) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Errore nel caricamento</h2>
          <p className="text-gray-600">Non è stato possibile caricare le impostazioni del sito.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Impostazioni</h1>
        <p className="text-gray-600">Configura le impostazioni del sito e dell'automazione</p>
      </div>

      {/* Configurazione WordPress */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Configurazione WordPress</h2>
        <p className="text-gray-600 mb-6">Configura il tuo sito WordPress per la pubblicazione automatica degli articoli</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome Sito *</label>
            <input
              type="text"
              value={siteSettings.name}
              onChange={(e) => handleSiteSettingsChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">URL Sito WordPress *</label>
            <input
              type="url"
              value={siteSettings.url}
              onChange={(e) => handleSiteSettingsChange('url', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username WordPress *</label>
            <input
              type="text"
              value={siteSettings.username}
              onChange={(e) => handleSiteSettingsChange('username', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password WordPress *</label>
            <input
              type="password"
              value={siteSettings.password}
              onChange={(e) => handleSiteSettingsChange('password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria Predefinita</label>
            <select
              value={siteSettings.defaultCategory || ''}
              onChange={(e) => handleSiteSettingsChange('defaultCategory', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleziona categoria</option>
              <option value="tecnologia">Tecnologia</option>
              <option value="business">Business</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="sport">Sport</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stato Predefinito</label>
            <select
              value={siteSettings.defaultStatus}
              onChange={(e) => handleSiteSettingsChange('defaultStatus', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Bozza</option>
              <option value="publish">Pubblicato</option>
              <option value="private">Privato</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Automazione Funzionalità</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={siteSettings.enableAutoGeneration}
                onChange={(e) => handleSiteSettingsChange('enableAutoGeneration', e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">🤖 Generazione automatica articoli</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={siteSettings.enableAutoPublish}
                onChange={(e) => handleSiteSettingsChange('enableAutoPublish', e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">📝 Pubblicazione automatica</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={siteSettings.enableFeaturedImage}
                onChange={(e) => handleSiteSettingsChange('enableFeaturedImage', e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">🖼️ Immagini in evidenza automatiche</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={siteSettings.enableCategories}
                onChange={(e) => handleSiteSettingsChange('enableCategories', e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">🏷️ Categorie automatiche</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={siteSettings.enableTags}
                onChange={(e) => handleSiteSettingsChange('enableTags', e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">🔖 Tag automatici</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : 'Salva Configurazione WordPress'}
        </button>
      </div>

      {/* Configurazione Prompt */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Configurazione Prompt</h2>
        <p className="text-gray-600 mb-6">Configura la generazione automatica dei titoli e dei contenuti degli articoli</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prompt per il Titolo</label>
            <textarea
              value={generationSettings.titlePrompt}
              onChange={(e) => handleGenerationSettingsChange('titlePrompt', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Crea il titolo per l'articolo basato sulla source..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prompt per il Contenuto</label>
            <textarea
              value={generationSettings.contentPrompt}
              onChange={(e) => handleGenerationSettingsChange('contentPrompt', e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Genera UN titolo accattivante per un articolo giornalistico completo basato sulla fonte..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prompt per Immagini</label>
            <textarea
              value={generationSettings.imagePrompt}
              onChange={(e) => handleGenerationSettingsChange('imagePrompt', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="in stile cartoon. Individua un dettaglio rappresentativo dell'idea base dell'articolo..."
            />
          </div>
        </div>
      </div>

      {/* Configurazione Generazione Immagini */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🎨 Configurazione Generazione Immagini</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🤖 Modalità Generazione Immagini</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="imageGenerationMode"
                  value="manual"
                  checked={generationSettings.imageGenerationMode === 'manual'}
                  onChange={(e) => handleGenerationSettingsChange('imageGenerationMode', e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">🔧 Modalità Manuale</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="imageGenerationMode"
                  value="automatic"
                  checked={generationSettings.imageGenerationMode === 'automatic'}
                  onChange={(e) => handleGenerationSettingsChange('imageGenerationMode', e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">⚡ Modalità Automatica</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modello AI per Immagini</label>
            <select
              value={generationSettings.imageModel}
              onChange={(e) => handleGenerationSettingsChange('imageModel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="dall-e-3">DALL-E 3</option>
              <option value="dall-e-2">DALL-E 2</option>
              <option value="midjourney">Midjourney</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dimensioni</label>
            <select
              value={generationSettings.imageSize}
              onChange={(e) => handleGenerationSettingsChange('imageSize', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1024x1024">1024x1024 (Quadrato)</option>
              <option value="1792x1024">1792x1024 (Panoramica)</option>
              <option value="1024x1792">1024x1792 (Verticale)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stile Predefinito</label>
            <select
              value={generationSettings.imageStyle}
              onChange={(e) => handleGenerationSettingsChange('imageStyle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="natural">Natural - Più naturale, meno AI</option>
              <option value="vivid">Vivid - Più drammatico e iperreale</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={generationSettings.enablePromptEngineering}
              onChange={(e) => handleGenerationSettingsChange('enablePromptEngineering', e.target.checked)}
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">🧠 Configurazione Prompt Engineering</span>
          </label>
        </div>
      </div>

      {/* Impostazioni Modello AI */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Impostazioni Modello AI</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modello</label>
            <select
              value={generationSettings.defaultModel}
              onChange={(e) => handleGenerationSettingsChange('defaultModel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sonar-pro">Sonar Pro - Con ricerca web in RT</option>
              <option value="gpt-4">GPT-4 (Consigliato - Più preciso)</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Temperatura (0-2)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={generationSettings.defaultTemperature}
              onChange={(e) => handleGenerationSettingsChange('defaultTemperature', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Token</label>
            <input
              type="number"
              value={generationSettings.defaultMaxTokens}
              onChange={(e) => handleGenerationSettingsChange('defaultMaxTokens', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Impostazioni Lingua e Stile */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Impostazioni Lingua e Stile</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lingua</label>
            <select
              value={generationSettings.defaultLanguage}
              onChange={(e) => handleGenerationSettingsChange('defaultLanguage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="it">Italiano</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tono</label>
            <select
              value={generationSettings.defaultTone}
              onChange={(e) => handleGenerationSettingsChange('defaultTone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="professionale">Professionale</option>
              <option value="amichevole">Amichevole</option>
              <option value="formale">Formale</option>
              <option value="casual">Casual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stile</label>
            <select
              value={generationSettings.defaultStyle}
              onChange={(e) => handleGenerationSettingsChange('defaultStyle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="giornalistico">Giornalistico</option>
              <option value="blog">Blog</option>
              <option value="accademico">Accademico</option>
              <option value="marketing">Marketing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
            <select
              value={generationSettings.defaultTargetAudience}
              onChange={(e) => handleGenerationSettingsChange('defaultTargetAudience', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="generale">Generale</option>
              <option value="tecnico">Tecnico</option>
              <option value="business">Business</option>
              <option value="giovani">Giovani</option>
            </select>
          </div>
        </div>
      </div>

      {/* Anteprima Configurazione */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Anteprima Configurazione</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Modello:</strong> {generationSettings.defaultModel}</p>
          <p><strong>Lingua:</strong> {generationSettings.defaultLanguage}</p>
          <p><strong>Stile:</strong> {generationSettings.defaultStyle} - {generationSettings.defaultTone}</p>
          <p><strong>Audience:</strong> {generationSettings.defaultTargetAudience}</p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Ripristina
        </button>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : 'Salva Impostazioni'}
        </button>
      </div>
    </div>
  );
}