import { PerplexityService } from './PerplexityService';
import { Result } from '../../shared/domain/types/Result';
import { ImageGenerationService } from './ImageGenerationService';
import { WordPressMediaService, WordPressConfig } from '../../../publishing/infrastructure/services/WordPressMediaService';

export interface SingleStepGenerationRequest {
  feedItemContent: string;
  feedItemTitle: string;
  feedItemUrl?: string;
  customPrompts: {
    titlePrompt?: string;
    contentPrompt?: string;
    seoPrompt?: string;
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
          maxTokens: request.settings?.maxTokens || 16000,
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

      // Extract SEO data from content if present
      const { metaDescription, seoTags } = this.extractSeoData(generated.content);

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
      titlePrompt = 'Crea un titolo accattivante e SEO-friendly per questo articolo',
      contentPrompt = 'Scrivi un articolo completo e ben strutturato basato su questo contenuto',
      seoPrompt = 'Includi meta description, tags e parole chiave ottimizzate per i motori di ricerca'
    } = request.customPrompts;

    const settings = request.settings || {};

    return `
Genera un articolo completo in formato JSON con questa struttura esatta:

\`\`\`json
{
  "title": "...",
  "content": "...",
  "metaDescription": "...",
  "seoTags": ["tag1", "tag2", "tag3"]
}
\`\`\`

ISTRUZIONI DETTAGLIATE:

TITOLO:
${titlePrompt}

CONTENUTO:
${contentPrompt}

SEO E METADATA:
${seoPrompt}

CONTENUTO SORGENTE DA ELABORARE:
Titolo originale: ${request.feedItemTitle}
Contenuto: ${request.feedItemContent}
${request.feedItemUrl ? `URL originale: ${request.feedItemUrl}` : ''}

PARAMETRI DI STILE:
- Lingua: ${settings.language || 'italiano'}
- Tono: ${settings.tone || 'professionale'}
- Stile: ${settings.style || 'giornalistico'}
- Target audience: ${settings.targetAudience || 'generale'}
- Lunghezza target: ${settings.maxTokens ? Math.floor(settings.maxTokens * 0.75) : 4000} parole

REQUISITI TECNICI:
- Rispondi SOLO con il JSON valido
- Non aggiungere testo prima o dopo il JSON
- Il contenuto deve essere formattato in HTML completo e ben strutturato
- Usa tag HTML semantici: <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>
- Includi div con classi CSS per una migliore struttura: <div class="intro">, <div class="section">, <div class="conclusion">
- La meta description deve essere max 160 caratteri
- Includi 3-5 tag SEO pertinenti
- L'articolo deve essere originale, ben strutturato e SEO-friendly
- Il contenuto HTML deve essere pronto per essere inserito direttamente in una pagina web

Genera l'articolo ora:`;
  }

  private extractSeoData(content: string): { metaDescription?: string; seoTags?: string[] } {
    // Try to extract SEO data from content if it contains structured info
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