'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function GenerateArticle() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Inserisci un argomento per l\'articolo');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/admin/generate-article-manually', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          siteId: siteId,
          customPrompts: {
            title: `Crea un titolo accattivante per un articolo su: ${topic}`,
            content: `Scrivi un articolo completo e dettagliato sull'argomento: ${topic}. L'articolo deve essere informativo, ben strutturato e coinvolgente.`,
            seo: `Genera meta description e parole chiave SEO per un articolo su: ${topic}`
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Successo: reindirizza alla pagina articoli
        alert('Articolo generato con successo!');
        router.push(`/user/${siteId}/articles`);
      } else {
        setError(result.error || 'Errore nella generazione dell\'articolo');
      }
    } catch (err) {
      console.error('Error generating article:', err);
      setError('Errore di connessione. Riprova più tardi.');
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !generating) {
      handleGenerate();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Genera Articolo</h1>
        <p className="text-gray-600">Crea nuovi contenuti utilizzando l'intelligenza artificiale</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Generazione Articoli AI</h2>
            <p className="text-gray-600">
              Inserisci l'argomento che vuoi trattare e l'AI genererà un articolo completo per te
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                Argomento dell'articolo *
              </label>
              <textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Esempio: Le novità dell'intelligenza artificiale nel 2024, Consigli per il marketing digitale, Ricette di cucina italiana..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={generating}
              />
              <p className="text-sm text-gray-500 mt-2">
                Descrivi brevemente l'argomento dell'articolo che vuoi generare
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="text-red-400 mr-2">⚠️</div>
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={generating || !topic.trim()}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generazione in corso...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Genera Articolo</span>
                  </>
                )}
              </button>
            </div>

            {generating && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="text-sm text-blue-700">
                  <div className="font-medium mb-2">🤖 Generazione in corso...</div>
                  <div className="space-y-1">
                    <div>• Analisi dell'argomento</div>
                    <div>• Creazione del titolo</div>
                    <div>• Generazione del contenuto</div>
                    <div>• Ottimizzazione SEO</div>
                  </div>
                  <div className="mt-3 text-xs">
                    Questo processo può richiedere alcuni secondi. Non chiudere la pagina.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">ℹ️ Come funziona</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">1.</span>
              <span>Inserisci l'argomento dell'articolo che vuoi generare</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">2.</span>
              <span>L'AI analizza l'argomento e genera un titolo accattivante</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">3.</span>
              <span>Viene creato un contenuto completo e ben strutturato</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">4.</span>
              <span>L'articolo viene salvato come bozza nella sezione "Articoli"</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 mt-0.5">5.</span>
              <span>Puoi revisionare e pubblicare quando sei pronto</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}