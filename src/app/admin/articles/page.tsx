'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ArticleSummary {
  id: string;
  title: string;
  excerpt: string;
  status: string;
  wordCount: number;
  estimatedReadingTime: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  sourceId?: string;
  sourceName?: string;
}

interface ArticleDetail {
  article: {
    id: string;
    title: string;
    content: string;
    status: string;
    sourceId?: string;
    createdAt: string;
    updatedAt: string;
  };
  source?: {
    id: string;
    name: string;
    type: string;
    url?: string;
  };
  feedItem?: {
    id: string;
    title: string;
    url?: string;
    publishedAt: string;
    processed: boolean;
  };
  statistics: {
    characterCount: number;
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    readingTime: number;
  };
  seo: {
    metaDescription: string;
    keywords: string[];
    tags: string[];
    estimatedSeoScore: number;
  };
  metadata: {
    generationType: string;
    originalUrl?: string;
    isFromFeed: boolean;
    generationDate: string;
    lastModified: string;
  };
}

interface SourceArticleGroup {
  sourceId: string;
  sourceName: string;
  articles: ArticleSummary[];
  totalCount: number;
  statusCounts: {
    draft: number;
    generated: number;
    ready_to_publish: number;
    published: number;
    failed: number;
  };
}

interface ArticlesBySourceResponse {
  articlesBySource: Record<string, SourceArticleGroup>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    totalArticles: number;
    totalSources: number;
    statusCounts: {
      draft: number;
      generated: number;
      ready_to_publish: number;
      published: number;
      failed: number;
    };
    mostActiveSource: string | null;
  };
}

export default function ArticlesBySourcePage() {
  const [data, setData] = useState<ArticlesBySourceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleSummary | null>(null);
  const [articleDetail, setArticleDetail] = useState<ArticleDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [testingWordPress, setTestingWordPress] = useState(false);
  const [wordPressTestResult, setWordPressTestResult] = useState<any>(null);
  const [searchingImage, setSearchingImage] = useState(false);
  const [imageSearchResult, setImageSearchResult] = useState<any>(null);
  const [enableAIGeneration, setEnableAIGeneration] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    sourceId: '',
    dateFrom: '',
    dateTo: ''
  });
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadArticlesBySource();
  }, [filters]);

  const loadArticlesBySource = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.sourceId) params.append('sourceId', filters.sourceId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      params.append('limit', '50');
      params.append('offset', '0');

      const response = await fetch(`/api/admin/articles-by-source?${params}`);

      if (!response.ok) {
        throw new Error('Errore durante il caricamento degli articoli');
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        // Auto-expand sources with articles
        const sourcesWithArticles = new Set(
          Object.keys(result.data.articlesBySource).filter(
            sourceId => result.data.articlesBySource[sourceId].articles.length > 0
          )
        );
        setExpandedSources(sourcesWithArticles);
      } else {
        throw new Error(result.error || 'Errore sconosciuto');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il caricamento');
      console.error('Error loading articles by source:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSourceExpansion = (sourceId: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId);
    } else {
      newExpanded.add(sourceId);
    }
    setExpandedSources(newExpanded);
  };

  const loadArticleDetail = async (articleId: string) => {
    try {
      setLoadingDetail(true);
      setArticleDetail(null);

      const response = await fetch(`/api/admin/articles/${articleId}`);

      if (!response.ok) {
        throw new Error('Errore durante il caricamento dei dettagli dell\'articolo');
      }

      const result = await response.json();

      if (result.success) {
        setArticleDetail(result.data);
      } else {
        throw new Error(result.error || 'Errore sconosciuto');
      }
    } catch (err) {
      console.error('Error loading article detail:', err);
      // Continue showing the basic modal even if detailed metadata fails
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleViewArticle = async (article: ArticleSummary) => {
    setSelectedArticle(article);
    setPublishError(null);
    setImageSearchResult(null); // Reset image search result

    await loadArticleDetail(article.id);

    // 🔄 Load saved featured image if available
    try {
      const imageResponse = await fetch(`/api/admin/articleimage?articleId=${article.id}`);
      if (imageResponse.ok) {
        const imageResult = await imageResponse.json();
        if (imageResult.success && imageResult.data) {
          setImageSearchResult(imageResult.data);
          console.log('🔄 [Frontend] Loaded saved featured image from database:', imageResult.data);
        }
      }
    } catch (error) {
      console.warn('⚠️ [Frontend] Failed to load saved featured image:', error);
      // Don't show error to user, it's not critical
    }
  };

  const handleTestWordPress = async () => {
    try {
      setTestingWordPress(true);
      setWordPressTestResult(null);

      // Get WordPress settings
      const wpResponse = await fetch('/api/admin/wordpress-settings', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user'
        }
      });

      if (!wpResponse.ok) {
        throw new Error('Impossibile caricare le impostazioni WordPress');
      }

      const wpData = await wpResponse.json();
      if (!wpData.success || !wpData.data.site) {
        throw new Error('Nessun sito WordPress configurato. Configura prima le impostazioni WordPress.');
      }

      const site = wpData.data.site;

      // Test WordPress connectivity
      const testResponse = await fetch('/api/admin/test-wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl: site.url,
          username: site.username,
          password: site.password
        })
      });

      if (!testResponse.ok) {
        throw new Error('Test WordPress fallito');
      }

      const testResult = await testResponse.json();
      setWordPressTestResult(testResult.data);

    } catch (error) {
      console.error('Error testing WordPress:', error);
      setWordPressTestResult({
        summary: { status: 'error', error: error instanceof Error ? error.message : 'Errore sconosciuto' },
        tests: []
      });
    } finally {
      setTestingWordPress(false);
    }
  };

  const handleGenerateImage = async (article: ArticleSummary, articleDetail: ArticleDetail | null) => {
    try {
      setSearchingImage(true);
      setImageSearchResult(null);

      // Extract article data for enhanced search
      const articleTitle = articleDetail?.article.title || article.title;
      const articleContent = articleDetail?.article.content || article.excerpt || '';

      // Extract featured image data from article content if available
      let aiPrompt = '';
      let filename = '';
      let altText = '';

      // Try to get featured image data from articleDetail
      if (articleDetail?.article.articleData) {
        const articleData = articleDetail.article.articleData as any;
        if (articleData.featured_image) {
          aiPrompt = articleData.featured_image.ai_prompt || '';
          filename = articleData.featured_image.filename || '';
          altText = articleData.featured_image.alt_text || '';
        }
      }

      // Fallback: generate data from article title and content
      if (!aiPrompt || !filename || !altText) {
        aiPrompt = `Professional image representing: ${articleTitle}`;
        filename = `featured-${article.id.substring(0, 8)}-${Date.now()}.jpg`;
        altText = `Image related to ${articleTitle}`;
      }

      console.log('🎯 [AI Generation] Starting AI image generation:', {
        articleId: article.id,
        enableAIGeneration,
        aiPrompt
      });

      let finalResult = null;
      let searchMethod = '';

      // 🎨 AI Generation
      if (enableAIGeneration) {
        console.log('🎨 [AI Generation] Starting AI image generation...');
        try {
          const aiResponse = await fetch('/api/admin/image/generate-only', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              articleId: article.id,
              articleTitle,
              articleContent,
              aiPrompt,
              filename,
              altText
            })
          });

          const aiData = await aiResponse.json();
          if (aiData.success && aiData.data) {
            finalResult = aiData.data;
            searchMethod = 'Generazione AI';
            console.log('✅ [AI Only] AI generation successful');
          } else {
            console.error('❌ [AI Only] AI generation failed:', aiData.error);
            throw new Error(aiData.error || 'AI generation failed');
          }
        } catch (aiError) {
          console.error('❌ [AI Only] AI generation error:', aiError);
          throw aiError;
        }
      }
      // AI generation completed above

      // 🎨 STEP 2: Try AI generation (if no search result and AI enabled, but not AI-only)
      if (!finalResult && enableAIGeneration && enableImageSearch) {
        try {
          console.log('🎨 [Step 2] Attempting AI generation...');
          const aiResponse = await fetch('/api/admin/image/generate-only', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              articleId: article.id,
              articleTitle,
              articleContent,
              aiPrompt,
              filename,
              altText
            })
          });

          const aiData = await aiResponse.json();
          if (aiData.success && aiData.data) {
            finalResult = aiData.data;
            searchMethod = 'Generazione AI';
            console.log('✅ [Step 2] AI generation successful');
          } else {
            console.log('⚠️ [Step 2] AI generation failed');
          }
        } catch (aiError) {
          console.warn('⚠️ [Step 2] AI generation failed:', aiError);
        }
      }

      // 🔄 STEP 3: Use original combined endpoint as final fallback (only if both flags enabled)
      if (!finalResult && enableImageSearch && enableAIGeneration) {
        console.log('🔄 [Step 3] Using original combined endpoint as fallback...');
        searchMethod = 'Fallback combinato';

        const response = await fetch('/api/admin/image/search-enhanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            articleId: article.id,
            articleTitle,
            articleContent,
            aiPrompt,
            filename,
            altText,
            forceRegenerate: false
          })
        });

        const result = await response.json();
        if (result.success) {
          finalResult = result.data;
        }
      }

      if (finalResult) {
        setImageSearchResult(finalResult);

        // 💾 Save image search result to database for persistence
        try {
          await fetch('/api/admin/articleimage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              articleId: article.id,
              imageSearchResult: finalResult
            })
          });
          console.log('💾 [Frontend] Image search result saved to database');
        } catch (saveError) {
          console.warn('⚠️ [Frontend] Failed to save image search result:', saveError);
        }

        // Enhanced success message
        const imageData = finalResult.image;
        const metadata = finalResult.metadata;

        const searchLevelText = {
          'ultra-specific': '🎯 Ultra-specifica (massima pertinenza)',
          'thematic': '🔍 Tematica (buona pertinenza)',
          'ai-generated': '🎨 Generata con AI (pertinenza garantita)',
          'search-only': '🔍 Solo ricerca (validata)',
          'ai-only': '🎨 Solo AI (personalizzata)'
        }[imageData.searchLevel] || imageData.searchLevel;

        alert(`🖼️ Immagine trovata con ${searchMethod}!\n\n` +
              `${searchLevelText}\n` +
              `📊 Score: ${imageData.relevanceScore}/100\n` +
              `🎨 Modalità: ${enableAIGeneration ? '✅' : '❌'} Generazione AI\n` +
              `📋 Keywords: ${metadata.keywords?.slice(0, 3).join(', ') || 'N/A'}\n` +
              `⏱️ Tempo: ${metadata.searchTime}ms\n\n` +
              `${metadata.wasGenerated ? '🎨 Generata con AI' : '📷 Fonte libera'}\n` +
              `URL: ${imageData.url.substring(0, 40)}...\n\n` +
              `✅ Pronta per caricamento automatico su WordPress!`);
      } else {
        alert('❌ Nessuna immagine trovata con i metodi selezionati');
      }

    } catch (error) {
      console.error('💥 [Frontend] Image generation exception:', error);
      alert('Errore durante la generazione dell\'immagine');
    } finally {
      setSearchingImage(false);
    }
  };

  const handlePublishToWordPress = async (article: ArticleSummary, articleDetail: ArticleDetail | null) => {
    try {
      setPublishing(true);
      setPublishError(null);

      // First get WordPress settings
      const wpResponse = await fetch('/api/admin/wordpress-settings', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user'
        }
      });

      if (!wpResponse.ok) {
        throw new Error('Impossibile caricare le impostazioni WordPress');
      }

      const wpData = await wpResponse.json();
      if (!wpData.success || !wpData.data.site) {
        throw new Error('Nessun sito WordPress configurato. Configura prima le impostazioni WordPress.');
      }

      const site = wpData.data.site;

      // 🔄 If no image in state, try to load saved image from database
      let featuredImageData = imageSearchResult;
      if (!featuredImageData) {
        try {
          const imageResponse = await fetch(`/api/admin/articleimage?articleId=${article.id}`);
          if (imageResponse.ok) {
            const imageResult = await imageResponse.json();
            if (imageResult.success && imageResult.data) {
              featuredImageData = imageResult.data;
              console.log('🔄 [Publish] Using saved featured image from database');
            }
          }
        } catch (error) {
          console.warn('⚠️ [Publish] Failed to load saved featured image:', error);
        }
      }

      // Prepare publication data with featured image
      const publicationData = {
        articleId: article.id,
        target: {
          platform: 'wordpress',
          siteId: site.id,
          siteUrl: site.url,
          configuration: {
            username: site.username,
            password: site.password,
            status: site.defaultStatus || 'publish'
          }
        },
        content: {
          title: articleDetail?.article.title || article.title,
          content: articleDetail?.article.content || article.excerpt,
          excerpt: articleDetail?.article.metaDescription || article.excerpt,
          slug: articleDetail?.article.slug
        },
        metadata: {
          categories: site.defaultCategory ? [site.defaultCategory] : [],
          tags: [], // ✅ SIMPLIFIED: Empty tags to avoid WordPress errors
          author: site.defaultAuthor,
          slug: articleDetail?.article.slug,
          excerpt: articleDetail?.article.metaDescription || article.excerpt, // ✅ YOAST: Consistent excerpt
          // ✅ YOAST SEO: Include meta description for Yoast plugin (fallback approach)
          yoast_wpseo_metadesc: articleDetail?.article.metaDescription
        },
        // ✅ FEATURED IMAGE: Include featured image if available
        featuredImage: featuredImageData ? {
          url: featuredImageData.image.url,
          filename: featuredImageData.image.filename,
          altText: featuredImageData.image.altText,
          title: featuredImageData.image.altText
        } : undefined
      };

      // Publish to WordPress
      const publishResponse = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publicationData)
      });

      if (!publishResponse.ok) {
        const errorData = await publishResponse.json().catch(() => ({ error: 'Errore di rete' }));
        throw new Error(errorData.error || 'Errore durante la pubblicazione');
      }

      const result = await publishResponse.json();

      if (!result.success) {
        throw new Error(result.error || 'Pubblicazione fallita');
      }

      // Success! Close modal and refresh data
      setSelectedArticle(null);
      setArticleDetail(null);
      await loadArticlesBySource();

      alert('Articolo pubblicato con successo su WordPress!');

    } catch (error) {
      console.error('Error publishing to WordPress:', error);
      setPublishError(error instanceof Error ? error.message : 'Errore sconosciuto durante la pubblicazione');
    } finally {
      setPublishing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated':
        return 'bg-green-100 text-green-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      case 'ready_to_publish':
        return 'bg-purple-100 text-purple-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'generated':
        return 'Generato';
      case 'published':
        return 'Pubblicato';
      case 'ready_to_publish':
        return 'Pronto per pubblicazione';
      case 'draft':
        return 'Bozza';
      case 'failed':
        return 'Fallito';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-medium text-red-800">Errore</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadArticlesBySource}
              className="mt-2 text-red-800 underline hover:text-red-900"
            >
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div>Nessun dato disponibile</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Articoli per Fonte
          </h1>
          <p className="text-gray-600">
            Gestisci tutti gli articoli raggruppati per fonte di origine
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/admin/settings"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ⚙️ Impostazioni Prompt
          </Link>
          <Link
            href="/admin/generate"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Genera Nuovo
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Articoli Totali</p>
              <p className="text-xl font-bold text-gray-900">{data.summary.totalArticles}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Fonti Attive</p>
              <p className="text-xl font-bold text-green-600">{data.summary.totalSources}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Pubblicati</p>
              <p className="text-xl font-bold text-purple-600">{data.summary.statusCounts.published}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Generati</p>
              <p className="text-xl font-bold text-yellow-600">{data.summary.statusCounts.generated}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tutti gli stati</option>
              <option value="draft">Bozza</option>
              <option value="generated">Generato</option>
              <option value="ready_to_publish">Pronto per pubblicazione</option>
              <option value="published">Pubblicato</option>
              <option value="failed">Fallito</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data da</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data a</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', sourceId: '', dateFrom: '', dateTo: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancella Filtri
            </button>
          </div>
        </div>
      </div>

      {/* Articles by Source */}
      {Object.keys(data.articlesBySource).length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nessun articolo trovato
          </h3>
          <p className="text-gray-600 mb-6">
            Non sono stati trovati articoli con i filtri selezionati.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(data.articlesBySource).map(([sourceId, group]) => (
            <div key={sourceId} className="bg-white rounded-lg shadow-sm border">
              {/* Source Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSourceExpansion(sourceId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {expandedSources.has(sourceId) ? (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {group.sourceName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {group.totalCount} articoli totali
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Status counts */}
                    {group.statusCounts.generated > 0 && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded-full">
                        {group.statusCounts.generated} generati
                      </span>
                    )}
                    {group.statusCounts.published > 0 && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 text-xs font-medium rounded-full">
                        {group.statusCounts.published} pubblicati
                      </span>
                    )}
                    {group.statusCounts.failed > 0 && (
                      <span className="bg-red-100 text-red-800 px-2 py-1 text-xs font-medium rounded-full">
                        {group.statusCounts.failed} falliti
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Articles List */}
              {expandedSources.has(sourceId) && (
                <div className="border-t border-gray-200">
                  {group.articles.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      Nessun articolo trovato per questa fonte
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {group.articles.map((article) => (
                        <div key={article.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-md font-medium text-gray-900">
                                  {article.title}
                                </h4>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(article.status)}`}>
                                  {getStatusText(article.status)}
                                </span>
                              </div>

                              <p className="text-gray-600 mb-2 text-sm">
                                {article.excerpt}
                              </p>

                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>{formatDate(article.createdAt)}</span>
                                <span>{article.wordCount} parole</span>
                                <span>{article.estimatedReadingTime} min lettura</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => handleViewArticle(article)}
                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Visualizza articolo completo"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Article Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => { setSelectedArticle(null); setArticleDetail(null); }}>
          <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-6xl shadow-lg rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4 mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedArticle.title}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{formatDate(selectedArticle.createdAt)}</span>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedArticle.status)}`}>
                    {getStatusText(selectedArticle.status)}
                  </span>
                  {articleDetail?.article.slug && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      slug: {articleDetail.article.slug}
                    </span>
                  )}
                  {articleDetail?.metadata.generationType && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      {articleDetail.metadata.generationType === '3-step-workflow' ? '3-Step AI' : 'Semplice'}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setSelectedArticle(null); setArticleDetail(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingDetail && (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2 text-gray-600">Caricamento dettagli...</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Main Content */}
              <div className="lg:col-span-2">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    Contenuto Articolo
                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      HTML Format
                    </span>
                  </h3>
                  <div className="max-h-96 overflow-y-auto bg-white rounded border p-4">
                    <div className="prose max-w-none">
                      <div
                        className="text-gray-700 leading-relaxed text-sm"
                        dangerouslySetInnerHTML={{
                          __html: articleDetail?.article.content || selectedArticle.excerpt
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata Sidebar */}
              <div className="space-y-4">

                {/* Statistics */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                    📊 Statistiche
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Parole:</span>
                      <span className="font-medium">{articleDetail?.statistics.wordCount || selectedArticle.wordCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Caratteri:</span>
                      <span className="font-medium">{articleDetail?.statistics.characterCount || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frasi:</span>
                      <span className="font-medium">{articleDetail?.statistics.sentenceCount || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paragrafi:</span>
                      <span className="font-medium">{articleDetail?.statistics.paragraphCount || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tempo lettura:</span>
                      <span className="font-medium">{articleDetail?.statistics.readingTime || selectedArticle.estimatedReadingTime} min</span>
                    </div>
                  </div>
                </div>

                {/* SEO Information */}
                {articleDetail?.seo && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                      🎯 SEO & Metadata
                    </h3>
                    <div className="space-y-3 text-sm">
                      {/* ✅ YOAST SEO: Meta Description from Yoast data */}
                      {articleDetail?.article.metaDescription && (
                        <div>
                          <span className="text-gray-600 font-medium">Meta Description (Yoast):</span>
                          <p className="text-gray-700 text-xs mt-1 bg-white rounded p-2 border">
                            {articleDetail.article.metaDescription}
                          </p>
                          <span className="text-xs text-gray-500">
                            {articleDetail.article.metaDescription.length}/160 caratteri
                          </span>
                        </div>
                      )}
                      {/* Fallback to extracted meta description if Yoast not available */}
                      {!articleDetail?.article.metaDescription && articleDetail.seo.metaDescription && (
                        <div>
                          <span className="text-gray-600 font-medium">Meta Description:</span>
                          <p className="text-gray-700 text-xs mt-1 bg-white rounded p-2">
                            {articleDetail.seo.metaDescription}
                          </p>
                        </div>
                      )}
                      {articleDetail.seo.keywords.length > 0 && (
                        <div>
                          <span className="text-gray-600 font-medium">Keywords:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {articleDetail.seo.keywords.map((keyword, i) => (
                              <span key={i} className="bg-green-100 text-green-800 px-2 py-1 text-xs rounded">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {articleDetail.seo.tags.length > 0 && (
                        <div>
                          <span className="text-gray-600 font-medium">Tags:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {articleDetail.seo.tags.map((tag, i) => (
                              <span key={i} className="bg-blue-100 text-blue-800 px-2 py-1 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-green-200">
                        <span className="text-gray-600">SEO Score:</span>
                        <span className={`font-bold ${articleDetail.seo.estimatedSeoScore >= 80 ? 'text-green-600' : articleDetail.seo.estimatedSeoScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {articleDetail.seo.estimatedSeoScore}/100
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Source Information */}
                {articleDetail?.source && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
                      🔗 Fonte
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600 font-medium">Nome:</span>
                        <p className="text-gray-700">{articleDetail.source.name}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Tipo:</span>
                        <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-1 text-xs rounded">
                          {articleDetail.source.type}
                        </span>
                      </div>
                      {articleDetail.metadata.originalUrl && (
                        <div>
                          <span className="text-gray-600 font-medium">URL Originale:</span>
                          <a
                            href={articleDetail.metadata.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs break-all block mt-1"
                          >
                            {articleDetail.metadata.originalUrl}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Generation Metadata */}
                {articleDetail?.metadata && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      ⚙️ Generazione
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-medium">
                          {articleDetail.metadata.generationType === '3-step-workflow' ? '3-Step AI' : 'Semplice'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Da Feed:</span>
                        <span className="font-medium">{articleDetail.metadata.isFromFeed ? 'Sì' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Generato:</span>
                        <span className="font-medium text-xs">{formatDate(articleDetail.metadata.generationDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Modificato:</span>
                        <span className="font-medium text-xs">{formatDate(articleDetail.metadata.lastModified)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Generation Configuration */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-purple-800 mb-3">🖼️ Generazione Immagini</h4>
                  <div className="flex flex-col space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={enableAIGeneration}
                        onChange={(e) => setEnableAIGeneration(e.target.checked)}
                        className="mr-2 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-purple-700">
                        🎨 <strong>Crea immagine con AI</strong> - Generazione personalizzata con DALL-E
                      </span>
                    </label>
                  </div>
                  <div className="mt-2 text-xs text-purple-600">
                    {enableAIGeneration ?
                      "🎨 Generazione AI attiva - Utilizza DALL-E per creare immagini personalizzate" :
                      "⚠️ Generazione AI disattivata - Nessuna immagine verrà creata"
                    }
                  </div>

                  <button
                    onClick={() => handleGenerateImage(selectedArticle!, articleDetail)}
                    disabled={searchingImage || !enableAIGeneration}
                    className="w-full mt-3 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-400 disabled:cursor-not-allowed flex items-center justify-center text-sm font-medium"
                  >
                    {searchingImage ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generando...
                      </>
                    ) : (
                      <>🎨 Genera immagine</>
                    )}
                  </button>
                </div>

                {/* JSON Viewer Button */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 mb-3 flex items-center">
                    🔍 Debug & Analisi
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => window.open(`/api/admin/articles/${selectedArticle.id}/prompt`, '_blank')}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      🤖 Visualizza Prompt Perplexity
                    </button>
                    <button
                      onClick={() => window.open(`/api/admin/articles/${selectedArticle.id}/advanced-data`, '_blank')}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      📊 Dati Avanzati SEO
                    </button>
                    <button
                      onClick={() => window.open(`/api/admin/articles/${selectedArticle.id}/raw-json`, '_blank')}
                      className="w-full px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      Visualizza JSON Originale
                    </button>
                  </div>
                  <p className="text-xs text-yellow-700 mt-2">
                    Mostra la risposta JSON grezza dall'AI per debug e analisi
                  </p>
                </div>

              </div>
            </div>

            {/* Image Search Results */}
            {imageSearchResult && (
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-purple-800">Immagine intelligente trovata</p>
                    <p className="text-xs text-purple-600">
                      {imageSearchResult.image?.searchLevel === 'ultra-specific' && '🎯 Ultra-specifica (score: ' + imageSearchResult.image.relevanceScore + '/100)'}
                      {imageSearchResult.image?.searchLevel === 'thematic' && '🔍 Tematica (score: ' + imageSearchResult.image.relevanceScore + '/100)'}
                      {imageSearchResult.image?.searchLevel === 'ai-generated' && '🎨 Generata con AI (pertinenza garantita)'}
                      {!imageSearchResult.image?.searchLevel && (imageSearchResult.metadata.wasGenerated ? '🎨 Generata con AI' : '📷 Fonte libera')}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <img
                      src={imageSearchResult.image.url}
                      alt={imageSearchResult.image.altText}
                      className="w-20 h-20 object-cover rounded-lg border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02IDZMMTQgMTQiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxwYXRoIGQ9Ik0xNCA2TDYgMTQiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=';
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-xs space-y-1">
                        <div>
                          <span className="font-medium text-gray-600">URL:</span>
                          <a
                            href={imageSearchResult.image.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-800 ml-1 break-all"
                          >
                            {imageSearchResult.image.url.substring(0, 60)}...
                          </a>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Alt Text:</span>
                          <span className="ml-1">{imageSearchResult.image.altText}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Filename:</span>
                          <span className="ml-1">{imageSearchResult.image.filename}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Fonte:</span>
                          <span className="ml-1 bg-purple-100 text-purple-800 px-1 rounded text-xs">
                            {imageSearchResult.metadata.provider}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Ricerca completata in {imageSearchResult.metadata.totalTime}ms •
                    {imageSearchResult.searchResults.totalFound} risultati trovati
                  </div>
                </div>
              </div>
            )}

            {/* WordPress Test Results */}
            {wordPressTestResult && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-800">Test WordPress Completato</p>
                    <p className="text-xs text-blue-600">
                      {wordPressTestResult.summary?.readyForPublishing
                        ? '✅ Pronto per la pubblicazione'
                        : '⚠️ Potrebbero esserci problemi di connessione'
                      }
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {wordPressTestResult.tests?.map((test: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{test.name}:</span>
                      <span className={`px-2 py-1 rounded ${
                        test.status === 'success' ? 'bg-green-100 text-green-800' :
                        test.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {test.status === 'success' ? '✅' : test.status === 'warning' ? '⚠️' : '❌'} {test.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Publish Error */}
            {publishError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">Errore di Pubblicazione</p>
                    <p className="text-sm text-red-700">{publishError}</p>
                  </div>
                </div>
              </div>
            )}


            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <div className="text-sm text-gray-500">
                {articleDetail?.metadata.generationType === '3-step-workflow' && (
                  <span className="flex items-center">
                    🤖 Generato con workflow 3-step: Perplexity → ChatGPT → Ottimizzazione
                  </span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => { setSelectedArticle(null); setArticleDetail(null); setPublishError(null); setWordPressTestResult(null); setImageSearchResult(null); }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Chiudi
                </button>
                <button
                  onClick={handleTestWordPress}
                  disabled={testingWordPress}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:bg-yellow-400 disabled:cursor-not-allowed flex items-center"
                >
                  {testingWordPress ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Testando...
                    </>
                  ) : (
                    <>🔧 Testa WordPress</>
                  )}
                </button>
                <button
                  onClick={() => handlePublishToWordPress(selectedArticle!, articleDetail)}
                  disabled={publishing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
                >
                  {publishing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Pubblicando...
                    </>
                  ) : (
                    <>📤 Pubblica su WordPress</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}