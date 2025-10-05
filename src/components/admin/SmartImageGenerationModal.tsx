'use client';

import { useState, useEffect } from 'react';

interface SmartImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: {
    id: string;
    title: string;
    content?: string;
    status: string;
  };
  onImageGenerated: (imageData: any) => void;
}

interface GeneratedImageData {
  image: {
    id: string;
    url: string;
    filename: string;
    altText: string;
    style: string;
    size: string;
    model: string;
  };
  prompt: {
    original: string;
    processed: string;
  };
}

type GenerationMode = 'manual' | 'ai_assisted' | 'full_auto';
type Step = 'mode_selection' | 'prompt_generation' | 'prompt_editing' | 'image_generating' | 'preview';

export default function SmartImageGenerationModal({
  isOpen,
  onClose,
  article,
  onImageGenerated
}: SmartImageGenerationModalProps) {
  const [step, setStep] = useState<Step>('mode_selection');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('ai_assisted');

  // Prompt-related state
  const [manualPrompt, setManualPrompt] = useState(`Crea un'immagine in evidenza per un articolo dal titolo "{title}" che parli di: {article}`);
  const [aiGeneratedPrompt, setAiGeneratedPrompt] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [promptWarnings, setPromptWarnings] = useState<string[]>([]);

  // Image generation state
  const [style, setStyle] = useState<'natural' | 'vivid'>('natural');
  const [size, setSize] = useState<'1792x1024' | '1024x1024' | '1024x1792'>('1792x1024');
  const [model, setModel] = useState<'dall-e-3'>('dall-e-3');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getCurrentPrompt = () => {
    switch (generationMode) {
      case 'manual':
        return manualPrompt;
      case 'ai_assisted':
      case 'full_auto':
        return aiGeneratedPrompt;
      default:
        return '';
    }
  };

  const handleModeSelection = async (mode: GenerationMode) => {
    setGenerationMode(mode);
    setError(null);

    if (mode === 'manual') {
      setStep('image_generating');
      await handleGenerateImage();
    } else if (mode === 'ai_assisted') {
      setStep('prompt_generation');
      await generateAiPrompt();
    } else if (mode === 'full_auto') {
      setStep('prompt_generation');
      await generateAiPrompt();
      // After prompt generation, automatically proceed to image generation
    }
  };

  const generateAiPrompt = async () => {
    setIsGeneratingPrompt(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/prompt/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId: article.id,
          articleTitle: article.title,
          articleContent: article.content || '',
          aiModel: 'gpt-4'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante la generazione del prompt');
      }

      if (result.success) {
        setAiGeneratedPrompt(result.generatedPrompt);
        setPromptId(result.promptId);

        if (generationMode === 'ai_assisted') {
          setStep('prompt_editing');
        } else if (generationMode === 'full_auto') {
          setStep('image_generating');
          await handleGenerateImageWithAiPrompt(result.generatedPrompt);
        }
      } else {
        throw new Error(result.error || 'Generazione prompt fallita');
      }

    } catch (error) {
      console.error('Errore generazione prompt:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
      setStep('mode_selection');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handlePromptEdit = async () => {
    if (!promptId || !aiGeneratedPrompt.trim()) {
      setError('Prompt non valido');
      return;
    }

    try {
      const response = await fetch('/api/admin/prompt/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptId,
          updatedPrompt: aiGeneratedPrompt
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante la validazione del prompt');
      }

      if (result.success) {
        setPromptSuggestions(result.suggestions || []);
        setPromptWarnings(result.warnings || []);
        setStep('image_generating');
        await handleGenerateImageWithAiPrompt(result.validatedPrompt);
      } else {
        throw new Error(result.error || 'Validazione prompt fallita');
      }

    } catch (error) {
      console.error('Errore validazione prompt:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    }
  };

  const handleGenerateImage = async () => {
    setGenerating(true);
    setError(null);
    setStep('image_generating');

    try {
      const response = await fetch(`/api/admin/articles/${article.id}/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: getCurrentPrompt(),
          style,
          size,
          model,
          generationMode,
          promptId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante la generazione dell\'immagine');
      }

      if (result.success) {
        setGeneratedImage(result.data);
        setStep('preview');
      } else {
        throw new Error(result.error || 'Generazione fallita');
      }

    } catch (error) {
      console.error('Errore generazione immagine:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
      setStep('mode_selection');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateImageWithAiPrompt = async (prompt: string) => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/articles/${article.id}/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          style,
          size,
          model,
          generationMode,
          promptId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante la generazione dell\'immagine');
      }

      if (result.success) {
        setGeneratedImage(result.data);
        setStep('preview');
      } else {
        throw new Error(result.error || 'Generazione fallita');
      }

    } catch (error) {
      console.error('Errore generazione immagine:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
      setStep('mode_selection');
    } finally {
      setGenerating(false);
    }
  };

  const handleAcceptImage = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(`/api/admin/articles/${article.id}/generate-image`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'accept',
          imageUrl: generatedImage.image.url,
          imageId: generatedImage.image.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante l\'accettazione dell\'immagine');
      }

      if (result.success) {
        onImageGenerated({
          ...generatedImage,
          accepted: true,
          newStatus: 'generated_with_image'
        });
        onClose();
        resetModal();
      } else {
        throw new Error(result.error || 'Accettazione fallita');
      }

    } catch (error) {
      console.error('Errore accettazione immagine:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    }
  };

  const handleRejectImage = () => {
    setStep('mode_selection');
    setGeneratedImage(null);
    setError(null);
  };

  const resetModal = () => {
    setStep('mode_selection');
    setGenerationMode('ai_assisted');
    setManualPrompt(`Crea un'immagine in evidenza per un articolo dal titolo "{title}" che parli di: {article}`);
    setAiGeneratedPrompt('');
    setPromptId(null);
    setPromptSuggestions([]);
    setPromptWarnings([]);
    setStyle('natural');
    setSize('1792x1024');
    setModel('dall-e-3');
    setGenerating(false);
    setGeneratedImage(null);
    setError(null);
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                🧠 Generazione Intelligente Immagine
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Articolo: {article.title.substring(0, 60)}...
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">

          {/* Step 1: Mode Selection */}
          {step === 'mode_selection' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Scegli la modalità di generazione
                </h3>
                <p className="text-gray-600">
                  Seleziona come vuoi creare l'immagine in evidenza per questo articolo
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Manual Mode */}
                <button
                  onClick={() => handleModeSelection('manual')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
                >
                  <div className="text-3xl mb-3">✏️</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Manuale</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Scrivi tu il prompt per DALL-E come hai sempre fatto
                  </p>
                  <div className="text-xs text-gray-500">
                    • Controllo completo<br/>
                    • Prompt personalizzato<br/>
                    • Esperienza familiare
                  </div>
                </button>

                {/* AI Assisted Mode */}
                <button
                  onClick={() => handleModeSelection('ai_assisted')}
                  className="p-6 border-2 border-blue-300 bg-blue-50 rounded-lg hover:border-blue-400 hover:bg-blue-100 transition-all group"
                >
                  <div className="text-3xl mb-3">🤝</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">AI Assistita</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    L'AI crea un prompt ottimizzato che puoi modificare
                  </p>
                  <div className="text-xs text-gray-500">
                    • Prompt AI ottimizzato<br/>
                    • Possibilità di editing<br/>
                    • ⭐ Consigliata
                  </div>
                </button>

                {/* Full Auto Mode */}
                <button
                  onClick={() => handleModeSelection('full_auto')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all group"
                >
                  <div className="text-3xl mb-3">🚀</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Completamente Automatica</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    L'AI crea prompt e immagine senza intervento
                  </p>
                  <div className="text-xs text-gray-500">
                    • Zero sforzo<br/>
                    • Più veloce<br/>
                    • Risultati coerenti
                  </div>
                </button>

              </div>

              {/* Configuration Options */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">⚙️ Configurazione Immagine</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stile</label>
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value as 'natural' | 'vivid')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="natural">Natural</option>
                      <option value="vivid">Vivid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dimensioni</label>
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="1792x1024">1792×1024 (Landscape)</option>
                      <option value="1024x1024">1024×1024 (Square)</option>
                      <option value="1024x1792">1024×1792 (Portrait)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modello</label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value as 'dall-e-3')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="dall-e-3">DALL-E 3</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

            </div>
          )}

          {/* Step 2: Prompt Generation */}
          {step === 'prompt_generation' && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Generazione prompt AI in corso...</h3>
              <p className="text-gray-600 mt-2">
                ChatGPT sta analizzando il tuo articolo e creando un prompt ottimizzato
              </p>
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-800">
                  🧠 Questo processo richiede 5-15 secondi
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Prompt Editing (AI Assisted only) */}
          {step === 'prompt_editing' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  🤖 Prompt Generato dall'AI
                </h3>
                <p className="text-gray-600">
                  Puoi modificare il prompt o procedere direttamente alla generazione
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt Ottimizzato
                </label>
                <textarea
                  value={aiGeneratedPrompt}
                  onChange={(e) => setAiGeneratedPrompt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Caratteri: {aiGeneratedPrompt.length}/4000
                </p>
              </div>

              {/* Suggestions */}
              {promptSuggestions.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">💡 Suggerimenti</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    {promptSuggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {promptWarnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ Avvertimenti</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {promptWarnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => setStep('mode_selection')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ← Torna alla Selezione
                </button>
                <div className="space-x-3">
                  <button
                    onClick={() => generateAiPrompt()}
                    disabled={isGeneratingPrompt}
                    className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 disabled:opacity-50"
                  >
                    🔄 Rigenera Prompt
                  </button>
                  <button
                    onClick={handlePromptEdit}
                    disabled={!aiGeneratedPrompt.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    🎨 Genera Immagine
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Image Generating */}
          {step === 'image_generating' && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Generazione immagine in corso...</h3>
              <p className="text-gray-600 mt-2">
                DALL-E 3 sta creando la tua immagine personalizzata
              </p>
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-yellow-800">
                  ⏱️ Questo processo può richiedere 30-60 secondi
                </p>
              </div>

              {/* Show the prompt being used */}
              {getCurrentPrompt() && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">🔧 Prompt in uso:</h4>
                  <p className="text-sm text-blue-800 italic">"{getCurrentPrompt()}"</p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Preview */}
          {step === 'preview' && generatedImage && (
            <div className="space-y-6">

              {/* Image Preview */}
              <div className="text-center">
                <img
                  src={generatedImage.image.url}
                  alt={generatedImage.image.altText}
                  className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                />
              </div>

              {/* Generation Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">📊 Dettagli Generazione</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Modalità:</span>
                    <div className="font-medium capitalize">{generationMode.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Dimensioni:</span>
                    <div className="font-medium">{generatedImage.image.size}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Stile:</span>
                    <div className="font-medium">{generatedImage.image.style}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Modello:</span>
                    <div className="font-medium">{generatedImage.image.model}</div>
                  </div>
                </div>
              </div>

              {/* Prompt Used */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">🔧 Prompt Utilizzato</h3>
                <div className="text-sm text-blue-800 bg-blue-100 rounded p-3 font-mono">
                  {generatedImage.prompt.processed}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => setStep('mode_selection')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ↶ Nuova Generazione
                </button>
                <div className="space-x-3">
                  <button
                    onClick={handleRejectImage}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100"
                  >
                    ❌ Rifiuta
                  </button>
                  <button
                    onClick={handleAcceptImage}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                  >
                    ✅ Accetta Immagine
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}