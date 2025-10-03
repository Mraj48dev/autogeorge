import { PerplexityService } from './PerplexityService';
import { Result } from '../../../../shared/domain/types/Result';
import { ImageGenerationService } from './ImageGenerationService';
import { WordPressMediaService, WordPressConfig } from '../../../publishing/infrastructure/services/WordPressMediaService';
import { ContentFormat } from '../../domain/ports/AiService';

export interface SingleStepGenerationRequest {
  feedItemContent: string;
  feedItemTitle: string;
  feedItemUrl?: string;
  customPrompts: {
    titlePrompt?: string;
    contentPrompt?: string;
    seoPrompt?: string;
    imagePrompt?: string;
  };
  settings?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    language?: string;
    tone?: string;
    style?: string;
    targetAudience?: string;
  };
  wordpressConfig?: WordPressConfig; // Per upload immagine automatico
  generateFeaturedImage?: boolean; // Se generare immagine in evidenza
}

export interface SingleStepGenerationResult {
  title: string;
  content: string;
  metaDescription?: string;
  seoTags?: string[];
  featuredImageId?: number; // ID dell'immagine caricata su WordPress
  featuredImageUrl?: string; // URL dell'immagine
  statistics: {
    characterCount: number;
    wordCount: number;
    readingTime: number;
  };
  cost: number;
  generationTime: number;
  model: string;
  rawResponse?: any; // ✅ For JSON viewer button
  promptSent?: string; // ✅ Exact prompt sent to Perplexity
}

export interface SingleStepGenerationError {
  message: string;
  details?: string;
}

/**
 * Unified single-step article generation service using only Perplexity
 * Replaces the complex 3-step workflow with a simple, unified approach
 */
export class SingleStepArticleGenerationService {
  private perplexityService: PerplexityService;
  private imageService: ImageGenerationService;
  private mediaService: WordPressMediaService;

  constructor(perplexityApiKey: string) {
    this.perplexityService = new PerplexityService(perplexityApiKey);
    this.imageService = new ImageGenerationService();
    this.mediaService = new WordPressMediaService();
  }

  async generateArticle(
    request: SingleStepGenerationRequest
  ): Promise<Result<SingleStepGenerationResult, SingleStepGenerationError>> {
    try {
      const startTime = Date.now();

      // Build unified prompt for Perplexity
      const unifiedPrompt = this.buildUnifiedPrompt(request);

      console.log('🤖 [SingleStep] Starting unified article generation...');
      console.log('📝 [SingleStep] Prompt preview:', unifiedPrompt.substring(0, 200) + '...');

      // Single call to Perplexity with all requirements
      const generationResult = await this.perplexityService.generateArticle({
        prompt: unifiedPrompt,
        model: request.settings?.model || 'sonar-pro',
        sourceContent: request.feedItemContent,
        language: request.settings?.language || 'it',
        tone: request.settings?.tone || 'professionale',
        style: request.settings?.style || 'giornalistico',
        targetAudience: request.settings?.targetAudience || 'generale',
        targetWordCount: request.settings?.maxTokens ? Math.floor(request.settings.maxTokens * 0.75) : 4000,
        parameters: {
          temperature: request.settings?.temperature || 0.7,
          maxTokens: request.settings?.maxTokens || 24000,
          model: request.settings?.model || 'sonar-pro'
        },
        metadata: {
          requestId: `single-step-${Date.now()}`,
          context: {
            sourceUrl: request.feedItemUrl,
            originalTitle: request.feedItemTitle
          }
        }
      });

      if (generationResult.isFailure()) {
        console.error('❌ [SingleStep] Perplexity generation failed:', generationResult.error);
        return Result.failure({
          message: 'Perplexity generation failed',
          details: generationResult.error.message
        });
      }

      const generated = generationResult.value;
      const generationTime = Date.now() - startTime;

      console.log('✅ [SingleStep] Generation completed successfully!');
      console.log('📊 [SingleStep] Stats:', {
        title: generated.title?.substring(0, 50) + '...',
        contentLength: generated.content?.length || 0,
        time: generationTime + 'ms',
        cost: generated.metadata?.cost || 0
      });

      // Extract SEO data from content and raw response
      const { metaDescription, seoTags } = this.extractSeoData(generated.content, generated.rawResponse);

      let featuredImageId: number | undefined;
      let featuredImageUrl: string | undefined;

      // Generate and upload featured image if requested
      if (request.generateFeaturedImage && request.wordpressConfig) {
        console.log('🖼️ [SingleStep] Generating featured image...');

        const imageResult = await this.generateAndUploadImage(
          generated.title || request.feedItemTitle,
          generated.content || request.feedItemContent,
          request.wordpressConfig
        );

        if (imageResult.isSuccess()) {
          featuredImageId = imageResult.value.id;
          featuredImageUrl = imageResult.value.url;
          console.log('✅ [SingleStep] Featured image uploaded successfully:', featuredImageId);
        } else {
          console.warn('⚠️ [SingleStep] Featured image generation failed:', imageResult.error.message);
          // Continue without featured image - don't fail the entire generation
        }
      }

      const result: SingleStepGenerationResult = {
        title: generated.title || 'Generated Article',
        content: generated.content || 'Content generated by AutoGeorge AI.',
        format: 'html' as ContentFormat,
        metaDescription,
        seoTags,
        featuredImageId,
        featuredImageUrl,
        statistics: generated.statistics || {
          characterCount: generated.content?.length || 0,
          wordCount: Math.floor((generated.content?.length || 0) / 5),
          readingTime: Math.ceil((generated.content?.length || 0) / 1000)
        },
        cost: generated.metadata?.cost || 0,
        generationTime,
        model: generated.modelUsed || request.settings?.model || 'sonar-pro',
        rawResponse: generated.rawResponse || generated, // ✅ Include raw response for JSON viewer
        promptSent: unifiedPrompt // ✅ Include the exact prompt sent to Perplexity
      };

      return Result.success(result);

    } catch (error) {
      console.error('💥 [SingleStep] Generation service error:', error);
      return Result.failure({
        message: 'Article generation service error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private buildUnifiedPrompt(request: SingleStepGenerationRequest): string {
    const {
      titlePrompt = 'che sia accattivante, SEO-friendly, chiaro e informativo.',
      contentPrompt = 'che sia completo, ben strutturato, originale e coinvolgente. Usa paragrafi chiari, evita strutture troppo rigide e non inserire i nomi "introduzione" e "conclusione". Tra un h2 e l\'altro inserisci almeno 500 parole.',
      imagePrompt = 'in stile cartoon. Individua un dettaglio rappresentativo dell\'idea base dell\'articolo. Non usare scritte né simboli.'
    } = request.customPrompts;

    // Costruisci i prompt completi concatenando la parte fissa con quella personalizzabile
    const fullTitlePrompt = `Crea il titolo per l'articolo generato a partire dalla source ${titlePrompt}`;
    const fullContentPrompt = `Crea un articolo generato a partire dalla source ${contentPrompt}`;
    const fullImagePrompt = `Crea il prompt per generare l'immagine in evidenza dell'articolo ${imagePrompt}`;

    const settings = request.settings || {};

    return `
FONTE DA ELABORARE:
Titolo originale: ${request.feedItemTitle}
Contenuto: ${request.feedItemContent}
${request.feedItemUrl ? `URL originale: ${request.feedItemUrl}` : ''}

ISTRUZIONI:
1. TITOLO: ${fullTitlePrompt}
2. CONTENUTO: ${fullContentPrompt}
3. IMMAGINE: ${fullImagePrompt}

Genera un articolo professionale completo in formato JSON con questa struttura AVANZATA e dettagliata:

\`\`\`json
{
  "article": {
    "basic_data": {
      "title": "",
      "slug": "",
      "category": "",
      "tags": [],
      "status": "draft"
    },

    "seo_critical": {
      "focus_keyword": "",
      "seo_title": "",
      "meta_description": "",
      "h1_tag": ""
    },

    "content": "",

    "featured_image": {
      "ai_prompt": "",
      "alt_text": "",
      "filename": ""
    },

    "internal_seo": {
      "internal_links": [
        {
          "anchor_text": "",
          "url": ""
        }
      ],
      "related_keywords": [],
      "entities": []
    },

    "user_engagement": {
      "reading_time": "",
      "cta": "",
      "key_takeaways": []
    }
  }
}
\`\`\`

📋 ISTRUZIONI DETTAGLIATE PER OGNI SEZIONE:

🎯 BASIC_DATA:
- title: Applica le istruzioni del titolo fornite sopra
- slug: Genera uno slug SEO-friendly (es: "danimarca-droni-vertice-ue")
- category: Determina la categoria più appropriata (es: "Politica", "Cronaca", "Sport")
- tags: Array di 5-8 tag pertinenti e specifici
- status: "draft" (predefinito)

🚀 SEO_CRITICAL:
- focus_keyword: La parola chiave principale per SEO (2-3 parole max)
- seo_title: Titolo ottimizzato per SERP (50-60 caratteri)
- meta_description: Descrizione meta ottimizzata (150-160 caratteri)
- h1_tag: Tag H1 principale dell'articolo

📝 CONTENT:
- content: Applica le istruzioni del contenuto fornite sopra - Articolo completo in HTML ben strutturato con almeno 3-4 sezioni H2, paragrafi, liste, formattazione semantica.

🖼️ FEATURED_IMAGE:
- ai_prompt: Applica le istruzioni per l'immagine fornite sopra
- alt_text: Testo alternativo SEO-friendly per l'immagine
- filename: Nome file suggerito (es: "articolo-immagine-2025.jpg")

🔗 INTERNAL_SEO:
- internal_links: Suggerimenti per 3-5 link interni con anchor text
- related_keywords: 10-15 parole chiave correlate per SEO semantico
- entities: Entità principali menzionate nell'articolo

👥 USER_ENGAGEMENT:
- reading_time: Tempo di lettura stimato (es: "5 minuti")
- cta: Call-to-action finale per coinvolgere il lettore
- key_takeaways: 3-5 punti chiave dell'articolo


⚙️ PARAMETRI DI STILE:
- Lingua: ${settings.language || 'italiano'}
- Tono: ${settings.tone || 'professionale'}
- Stile: ${settings.style || 'giornalistico'}
- Target audience: ${settings.targetAudience || 'generale'}
- Lunghezza target: ${settings.maxTokens ? Math.floor(settings.maxTokens * 0.75) : 4000} parole

🔧 REQUISITI TECNICI AVANZATI:
- Rispondi SOLO con il JSON valido, senza testo aggiuntivo
- Tutti i contenuti HTML devono essere completi e ben formattati
- Usa tag HTML semantici: <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>
- Include div con classi CSS: <div class="intro">, <div class="section">, <div class="conclusion">
- Ogni sezione deve essere autonoma e ben strutturata
- Ottimizza per SEO on-page e user experience
- Includi microdati e structured data quando possibile
- Assicurati che word_count sia accurato
- Focus keyword deve apparire nel titolo, H1, meta description e nel primo paragrafo
- Related keywords devono essere distribuite naturalmente nel testo

🎯 GENERA L'ARTICOLO AVANZATO ORA:`;
  }

  private extractSeoData(content: string, rawResponse?: any): { metaDescription?: string; seoTags?: string[] } {
    // ✅ NEW: Extract from advanced structure first
    if (rawResponse?.article) {
      const article = rawResponse.article;

      return {
        metaDescription: article.seo_critical?.meta_description || article.basic_data?.meta_description,
        seoTags: article.basic_data?.tags || article.internal_seo?.related_keywords?.slice(0, 5) || []
      };
    }

    // ✅ LEGACY: Extract from old structure
    if (rawResponse?.metaDescription || rawResponse?.seoTags) {
      return {
        metaDescription: rawResponse.metaDescription,
        seoTags: rawResponse.seoTags || []
      };
    }

    // ✅ FALLBACK: Try to extract SEO data from content text
    const metaMatch = content.match(/meta.{0,20}description[:\s]*([^.\n]{50,160})/i);
    const tagsMatch = content.match(/tags?[:\s]*([^.\n]+)/i);

    return {
      metaDescription: metaMatch?.[1]?.trim(),
      seoTags: tagsMatch?.[1]?.split(',').map(tag => tag.trim()).filter(Boolean)
    };
  }

  /**
   * Generates and uploads a featured image for the article
   */
  private async generateAndUploadImage(
    title: string,
    content: string,
    wpConfig: WordPressConfig
  ): Promise<Result<{ id: number; url: string }, { message: string; details?: string }>> {
    try {
      // Generate image based on title
      const imageResult = await this.imageService.generateImage({
        title,
        content,
        style: 'photo',
        size: 'large'
      });

      if (imageResult.isFailure()) {
        return Result.failure({
          message: 'Failed to generate image',
          details: imageResult.error.message
        });
      }

      const generatedImage = imageResult.value;

      // Download the image
      const downloadResult = await this.imageService.downloadImage(
        generatedImage.url,
        `featured-${Date.now()}.jpg`
      );

      if (downloadResult.isFailure()) {
        return Result.failure({
          message: 'Failed to download generated image',
          details: downloadResult.error.message
        });
      }

      const imageFile = downloadResult.value;

      // Upload to WordPress
      const uploadResult = await this.mediaService.uploadMedia(wpConfig, {
        file: imageFile,
        title: `Featured Image - ${title}`,
        alt_text: generatedImage.alt_text,
        caption: generatedImage.metadata?.author ? `Photo by ${generatedImage.metadata.author}` : undefined
      });

      if (uploadResult.isFailure()) {
        return Result.failure({
          message: 'Failed to upload image to WordPress',
          details: uploadResult.error.message
        });
      }

      const uploadedMedia = uploadResult.value;

      return Result.success({
        id: uploadedMedia.id,
        url: uploadedMedia.url
      });

    } catch (error) {
      return Result.failure({
        message: 'Image generation and upload error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}