'use client';

import { useState } from 'react';

interface ManualImageGenerationModalProps {
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

export default function ManualImageGenerationModal({
  isOpen,
  onClose,
  article,
  onImageGenerated
}: ManualImageGenerationModalProps) {
  const [step, setStep] = useState<'prompt' | 'generating' | 'preview'>('prompt');
  const [prompt, setPrompt] = useState(`Crea un'immagine in evidenza per un articolo dal titolo "{title}" che parli di: {article}`);
  const [style, setStyle] = useState<'natural' | 'vivid'>('natural');
  const [size, setSize] = useState<'1792x1024' | '1024x1024' | '1024x1792'>('1792x1024');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Il prompt è obbligatorio');
      return;
    }

    setGenerating(true);
    setError(null);
    setStep('generating');

    try {
      const response = await fetch(`/api/admin/articles/${article.id}/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style,
          size,
          model: 'dall-e-3'
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
      setStep('prompt');
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

  const handleRejectImage = async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(`/api/admin/articles/${article.id}/generate-image`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reject'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante il rifiuto dell\'immagine');
      }

      // Reset to prompt step for retry
      setStep('prompt');
      setGeneratedImage(null);
      setError(null);

    } catch (error) {
      console.error('Errore rifiuto immagine:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto');
    }
  };

  const resetModal = () => {
    setStep('prompt');
    setPrompt(`Crea un'immagine in evidenza per un articolo dal titolo "{title}" che parli di: {article}`);
    setStyle('natural');
    setSize('1792x1024');
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
                🎨 Generazione Manuale Immagine
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

          {/* Step 1: Prompt Configuration */}
          {step === 'prompt' && (
            <div className="space-y-6">

              {/* Placeholder Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  📋 Placeholder Disponibili
                </h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <div><code className="bg-blue-100 px-2 py-1 rounded">{'{title}'}</code> - Titolo dell'articolo</div>
                  <div><code className="bg-blue-100 px-2 py-1 rounded">{'{article}'}</code> - Contenuto dell'articolo (troncato a 500 caratteri)</div>
                </div>
              </div>

              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🖼️ Prompt per DALL-E 3
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={4}
                  placeholder={`Esempio: Crea un'immagine in evidenza per un articolo dal titolo "{title}" che parli di: {article}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usa i placeholder per personalizzare il prompt in base all'articolo
                </p>
              </div>

              {/* Style Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎨 Stile
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as 'natural' | 'vivid')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="natural">Natural - Più naturale, meno saturato</option>
                    <option value="vivid">Vivid - Colori drammatici, iperrealistici</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📐 Dimensioni
                  </label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="1792x1024">1792×1024 (Landscape)</option>
                    <option value="1024x1024">1024×1024 (Square)</option>
                    <option value="1024x1792">1024×1792 (Portrait)</option>
                  </select>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Errore</h3>
                      <div className="mt-2 text-sm text-red-700">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Annulla
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  🎨 Genera Immagine
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Generating */}
          {step === 'generating' && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Generazione in corso...</h3>
              <p className="text-gray-600 mt-2">
                DALL-E 3 sta creando la tua immagine personalizzata
              </p>
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-yellow-800">
                  ⏱️ Questo processo può richiedere 30-60 secondi
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
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

              {/* Image Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">📊 Dettagli Immagine</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                  <div>
                    <span className="text-gray-600">File:</span>
                    <div className="font-medium text-xs">{generatedImage.image.filename}</div>
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
                  onClick={() => setStep('prompt')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  ↶ Modifica Prompt
                </button>
                <div className="space-x-3">
                  <button
                    onClick={handleRejectImage}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    ❌ Rifiuta
                  </button>
                  <button
                    onClick={handleAcceptImage}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
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