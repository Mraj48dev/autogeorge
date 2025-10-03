'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

interface PromptAnalysis {
  article: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
  };
  image: {
    id: string;
    status: string;
    hasUrl: boolean;
    isUploadedToWordPress: boolean;
    createdAt: string;
  };
  prompt: {
    text: string;
    preview: string;
    length: number;
    words: number;
    lines: number;
    type: string;
    category: string;
    estimatedQuality: string;
    qualityScore: number;
    features: {
      hasStyleSpecs: boolean;
      hasLightingSpecs: boolean;
      hasColorSpecs: boolean;
      hasQualitySpecs: boolean;
      hasItalianContext: boolean;
      hasNegativePrompts: boolean;
      hasTechnicalSpecs: boolean;
    };
  };
}

interface Stats {
  totalArticlesWithImages: number;
  averagePromptLength: number;
  promptTypes: Record<string, number>;
  qualityDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  averageQualityScore: number;
}

export default function ImagePromptsPage() {
  const [prompts, setPrompts] = useState<PromptAnalysis[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/image-prompts/list');
      const data = await response.json();

      if (data.success) {
        setPrompts(data.data);
        setStats(data.statistics);
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium-high': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'auto-cron-template': return 'bg-orange-100 text-orange-800';
      case 'category-specific': return 'bg-purple-100 text-purple-800';
      case 'detailed-custom': return 'bg-green-100 text-green-800';
      case 'standard-custom': return 'bg-blue-100 text-blue-800';
      case 'basic-custom': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento prompt DALL-E...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📸 Prompt DALL-E Utilizzati</h1>
        <p className="text-gray-600">Analisi dei prompt inviati a OpenAI per la generazione delle immagini</p>
      </div>

      {/* Statistiche Generali */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Articoli con Immagini</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalArticlesWithImages}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Lunghezza Media Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.averagePromptLength}</div>
              <div className="text-sm text-gray-500">caratteri</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Punteggio Qualità</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.averageQualityScore}/7</div>
              <div className="text-sm text-gray-500">media sistema</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Alta Qualità</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {Math.round((stats.qualityDistribution.high || 0) / stats.totalArticlesWithImages * 100)}%
              </div>
              <div className="text-sm text-gray-500">prompt ottimizzati</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Raccomandazioni */}
      {recommendations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">💡 Raccomandazioni</h2>
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <Alert key={index} className={
                rec.startsWith('🔴') ? 'border-red-200 bg-red-50' :
                rec.startsWith('🟡') ? 'border-yellow-200 bg-yellow-50' :
                'border-green-200 bg-green-50'
              }>
                <AlertDescription>{rec}</AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* Lista Prompt */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">🎨 Prompt per Articolo</h2>

        {prompts.map((item) => (
          <Card key={item.article.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{item.article.title}</CardTitle>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline">{item.article.status}</Badge>
                    <Badge className={getQualityColor(item.prompt.estimatedQuality)}>
                      {item.prompt.estimatedQuality}
                    </Badge>
                    <Badge className={getTypeColor(item.prompt.type)}>
                      {item.prompt.type}
                    </Badge>
                    <Badge variant="outline">{item.prompt.category}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    📏 {item.prompt.length} caratteri •
                    📝 {item.prompt.words} parole •
                    🏆 {item.prompt.qualityScore}/7 qualità •
                    📅 {new Date(item.article.createdAt).toLocaleDateString('it-IT')}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedArticle(
                    expandedArticle === item.article.id ? null : item.article.id
                  )}
                >
                  {expandedArticle === item.article.id ? 'Nascondi' : 'Vedi Prompt'}
                </Button>
              </div>
            </CardHeader>

            {expandedArticle === item.article.id && (
              <CardContent className="border-t bg-gray-50">
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">🎯 Features del Prompt:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Badge variant={item.prompt.features.hasStyleSpecs ? "default" : "secondary"}>
                      {item.prompt.features.hasStyleSpecs ? '✅' : '❌'} Stile
                    </Badge>
                    <Badge variant={item.prompt.features.hasLightingSpecs ? "default" : "secondary"}>
                      {item.prompt.features.hasLightingSpecs ? '✅' : '❌'} Illuminazione
                    </Badge>
                    <Badge variant={item.prompt.features.hasColorSpecs ? "default" : "secondary"}>
                      {item.prompt.features.hasColorSpecs ? '✅' : '❌'} Colori
                    </Badge>
                    <Badge variant={item.prompt.features.hasQualitySpecs ? "default" : "secondary"}>
                      {item.prompt.features.hasQualitySpecs ? '✅' : '❌'} Qualità
                    </Badge>
                    <Badge variant={item.prompt.features.hasItalianContext ? "default" : "secondary"}>
                      {item.prompt.features.hasItalianContext ? '✅' : '❌'} Contesto IT
                    </Badge>
                    <Badge variant={item.prompt.features.hasNegativePrompts ? "default" : "secondary"}>
                      {item.prompt.features.hasNegativePrompts ? '✅' : '❌'} Negativi
                    </Badge>
                    <Badge variant={item.prompt.features.hasTechnicalSpecs ? "default" : "secondary"}>
                      {item.prompt.features.hasTechnicalSpecs ? '✅' : '❌'} Tecnici
                    </Badge>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold mb-2">📝 Prompt Completo Inviato a DALL-E:</h4>
                  <div className="bg-white p-4 rounded-lg border font-mono text-sm whitespace-pre-wrap">
                    {item.prompt.text || 'Nessun prompt disponibile'}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  🆔 Article ID: {item.article.id} •
                  🖼️ Image ID: {item.image.id} •
                  📊 Status: {item.image.status} •
                  {item.image.isUploadedToWordPress ? '✅ Su WordPress' : '⏳ Non su WordPress'}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {prompts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🖼️</div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Nessun Prompt Trovato</h3>
            <p className="text-gray-500">Non ci sono ancora articoli con immagini generate.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}