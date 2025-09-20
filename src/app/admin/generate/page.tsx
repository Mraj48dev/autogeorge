'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GeneratedArticle {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  status: string;
  createdAt: string;
}

export default function GenerateArticle() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    prompt: '',
    model: 'sonar',
    targetWordCount: 800,
    tone: 'professional',
    style: 'blog',
    keywords: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setGeneratedArticle(null);

    try {
      const keywords = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const response = await fetch('/api/admin/generate-article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          keywords,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante la generazione');
      }

      setGeneratedArticle(data.article);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'targetWordCount' ? parseInt(value) || 800 : value
    }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Genera Nuovo Articolo
        </h1>
        <p className="text-gray-600">
          Utilizza l'AI per generare articoli di alta qualità automaticamente
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Prompt */}
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                Prompt / Argomento *
              </label>
              <textarea
                id="prompt"
                name="prompt"
                rows={4}
                required
                value={formData.prompt}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Descrivi l'argomento dell'articolo che vuoi generare..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimo 10 caratteri. Sii specifico per risultati migliori.
              </p>
            </div>

            {/* Model */}
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                Modello AI
              </label>
              <select
                id="model"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="sonar">Sonar (Veloce)</option>
                <option value="sonar pro">Sonar Pro (Qualità)</option>
                <option value="sonar reasoning">Sonar Reasoning (Analisi)</option>
                <option value="sonar reasoning pro">Sonar Reasoning Pro (Avanzato)</option>
                <option value="sonar deep research">Sonar Deep Research (Ricerca)</option>
              </select>
            </div>

            {/* Word Count */}
            <div>
              <label htmlFor="targetWordCount" className="block text-sm font-medium text-gray-700 mb-2">
                Lunghezza Target (parole)
              </label>
              <input
                type="number"
                id="targetWordCount"
                name="targetWordCount"
                min="100"
                max="3000"
                value={formData.targetWordCount}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Tone and Style */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-2">
                  Tono
                </label>
                <select
                  id="tone"
                  name="tone"
                  value={formData.tone}
                  onChange={handleInputChange}
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
                <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
                  Stile
                </label>
                <select
                  id="style"
                  name="style"
                  value={formData.style}
                  onChange={handleInputChange}
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

            {/* Keywords */}
            <div>
              <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
                Keywords (opzionale)
              </label>
              <input
                type="text"
                id="keywords"
                name="keywords"
                value={formData.keywords}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="keyword1, keyword2, keyword3"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separa le keywords con virgole
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isGenerating || formData.prompt.length < 10}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generazione in corso...
                </div>
              ) : (
                'Genera Articolo'
              )}
            </button>
          </form>
        </div>

        {/* Result */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Risultato
          </h3>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800 mb-1">
                    Errore durante la generazione
                  </h4>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {isGenerating && (
            <div className="text-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Generazione articolo in corso...</p>
              <p className="text-sm text-gray-500 mt-2">Questo potrebbe richiedere alcuni secondi</p>
            </div>
          )}

          {/* Generated Article */}
          {generatedArticle && (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-800 font-medium">
                    Articolo generato con successo!
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Titolo:</h4>
                  <p className="text-lg font-semibold text-gray-800 bg-gray-50 p-3 rounded">
                    {generatedArticle.title}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Parole: {generatedArticle.wordCount}</span>
                  <span>Status: {generatedArticle.status}</span>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Contenuto:</h4>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">
                      {generatedArticle.content}
                    </pre>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => router.push('/admin/articles')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Vedi tutti gli articoli
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedArticle(null);
                      setFormData(prev => ({ ...prev, prompt: '' }));
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Genera altro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isGenerating && !generatedArticle && !error && (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Compila il form e clicca "Genera Articolo"</p>
              <p className="text-sm mt-2">L'articolo generato apparirà qui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}