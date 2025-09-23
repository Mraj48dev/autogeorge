import { PerplexityService } from './PerplexityService';
import { OpenAIService } from './OpenAIService';
import { Result } from '../../shared/domain/types/Result';

export interface ThreeStepGenerationRequest {
  articleUrl: string;
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
}

export interface ThreeStepGenerationResult {
  step1: {
    researchContent: string;
    sources: string[];
    perplexityMetadata: any;
  };
  step2: {
    finalArticle: string;
    title: string;
    chatgptMetadata: any;
  };
  step3: {
    optimizedTitle: string;
    metaDescription: string;
    seoTags: string[];
    additionalMetadata: any;
  };
  totalCost: number;
  totalTime: number;
}

export interface ThreeStepGenerationError {
  step: 1 | 2 | 3;
  error: string;
  details?: any;
}

/**
 * Three-step article generation service combining Perplexity and ChatGPT
 *
 * Step 1: Perplexity research - Read original article and conduct web research
 * Step 2: ChatGPT content generation - Transform research into styled article
 * Step 3: ChatGPT optimization - Generate title, SEO metadata, and tags
 */
export class ThreeStepArticleGenerationService {
  private perplexityService: PerplexityService;
  private openaiService: OpenAIService;

  constructor(perplexityApiKey: string, openaiApiKey: string) {
    this.perplexityService = new PerplexityService(perplexityApiKey);
    this.openaiService = new OpenAIService(openaiApiKey);
  }

  async generateArticle(request: ThreeStepGenerationRequest): Promise<Result<ThreeStepGenerationResult, ThreeStepGenerationError>> {
    const startTime = Date.now();
    let totalCost = 0;

    try {
      // STEP 1: Perplexity Research
      console.log('🔍 Step 1: Starting Perplexity research...');
      const step1Result = await this.executeStep1(request.articleUrl);

      if (step1Result.isFailure()) {
        return Result.failure({
          step: 1,
          error: 'Perplexity research failed',
          details: step1Result.error
        });
      }

      const researchData = step1Result.value;
      totalCost += researchData.metadata.cost || 0;
      console.log('✅ Step 1 completed:', researchData.content.substring(0, 100) + '...');

      // STEP 2: ChatGPT Content Generation
      console.log('✍️ Step 2: Starting ChatGPT content generation...');
      const step2Result = await this.executeStep2(researchData.content, request.customPrompts.contentPrompt, request.settings);

      if (step2Result.isFailure()) {
        return Result.failure({
          step: 2,
          error: 'ChatGPT content generation failed',
          details: step2Result.error
        });
      }

      const contentData = step2Result.value;
      totalCost += contentData.metadata.cost || 0;
      console.log('✅ Step 2 completed:', contentData.title);

      // STEP 3: ChatGPT Optimization
      console.log('🎯 Step 3: Starting ChatGPT optimization...');
      const step3Result = await this.executeStep3(
        contentData.content,
        contentData.title,
        request.customPrompts.titlePrompt,
        request.customPrompts.seoPrompt,
        request.settings
      );

      if (step3Result.isFailure()) {
        return Result.failure({
          step: 3,
          error: 'ChatGPT optimization failed',
          details: step3Result.error
        });
      }

      const optimizationData = step3Result.value;
      totalCost += optimizationData.titleMetadata.cost + optimizationData.seoMetadata.cost;
      console.log('✅ Step 3 completed: All optimization done');

      // Compile final result
      const result: ThreeStepGenerationResult = {
        step1: {
          researchContent: researchData.content,
          sources: researchData.sources,
          perplexityMetadata: researchData.metadata
        },
        step2: {
          finalArticle: contentData.content,
          title: contentData.title,
          chatgptMetadata: contentData.metadata
        },
        step3: {
          optimizedTitle: optimizationData.optimizedTitle,
          metaDescription: optimizationData.metaDescription,
          seoTags: optimizationData.seoTags,
          additionalMetadata: optimizationData.seoMetadata
        },
        totalCost,
        totalTime: Date.now() - startTime
      };

      console.log('🎉 Three-step generation completed successfully!');
      return Result.success(result);

    } catch (error) {
      console.error('💥 Three-step generation failed:', error);
      return Result.failure({
        step: 1,
        error: 'Unexpected error during generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Step 1: Perplexity Research
   * Read the original article URL and conduct comprehensive research
   */
  private async executeStep1(articleUrl: string) {
    const researchPrompt = `Read and analyze the content from this URL: ${articleUrl}

Please:
1. Extract the main topic and key information from the article
2. Conduct comprehensive internet research to gather additional context, background information, and related facts
3. Identify trending aspects, recent developments, and expert opinions on this topic
4. Compile all information into a comprehensive, factual, and well-researched draft

Provide a neutral, informative overview that could serve as the foundation for a detailed article. Include relevant facts, statistics, quotes, and context that would make the final article comprehensive and authoritative.

Format your response as a structured research report with clear sections and bullet points for easy consumption by a content writer.`;

    const result = await this.perplexityService.generateArticle({
      prompt: researchPrompt,
      model: 'sonar pro',
      parameters: {
        maxTokens: 4000,
        temperature: 0.3, // Lower temperature for factual research
      },
      metadata: {
        requestId: `step1-${Date.now()}`
      }
    });

    if (result.isFailure()) {
      return result;
    }

    // Extract sources from the result (Perplexity typically includes citations)
    const sources = this.extractSources(result.value.content);

    return Result.success({
      content: result.value.content,
      sources,
      metadata: result.value.metadata
    });
  }

  /**
   * Step 2: ChatGPT Content Generation
   * Transform the research into a styled article using user's content prompt
   */
  private async executeStep2(researchContent: string, contentPrompt?: string, settings?: any) {
    const defaultContentPrompt = 'Trasforma questa ricerca in un articolo completo, ben strutturato e coinvolgente. Mantieni un tono professionale e assicurati che sia informativo e di facile lettura.';

    const finalContentPrompt = contentPrompt || defaultContentPrompt;

    const generationPrompt = `Basandoti su questa ricerca approfondita, scrivi un articolo completo seguendo le istruzioni specifiche.

RICERCA DI BASE:
${researchContent}

ISTRUZIONI PER L'ARTICOLO:
${finalContentPrompt}

REQUISITI AGGIUNTIVI:
- Tono: ${settings?.tone || 'professionale'}
- Stile: ${settings?.style || 'giornalistico'}
- Target audience: ${settings?.targetAudience || 'generale'}
- Lingua: ${settings?.language || 'italiano'}

Scrivi un articolo completo, ben strutturato con paragrafi chiari, che trasformi le informazioni di ricerca in contenuto coinvolgente e accessibile. Includi un titolo accattivante all'inizio.`;

    const result = await this.openaiService.generateArticle({
      prompt: generationPrompt,
      model: settings?.model || 'gpt-4o-mini',
      parameters: {
        maxTokens: settings?.maxTokens || 4000,
        temperature: settings?.temperature || 0.7,
      },
      tone: settings?.tone,
      style: settings?.style,
      targetAudience: settings?.targetAudience,
      metadata: {
        requestId: `step2-${Date.now()}`
      }
    });

    return result;
  }

  /**
   * Step 3: ChatGPT Optimization
   * Generate optimized title and SEO metadata using user's prompts
   */
  private async executeStep3(articleContent: string, currentTitle: string, titlePrompt?: string, seoPrompt?: string, settings?: any) {
    // Sub-step 3a: Generate optimized title
    const defaultTitlePrompt = 'Crea un titolo accattivante e SEO-friendly per questo articolo. Il titolo deve essere chiaro, informativo e ottimizzato per i motori di ricerca.';
    const finalTitlePrompt = titlePrompt || defaultTitlePrompt;

    const titleGenerationPrompt = `Basandoti su questo articolo, crea un titolo seguendo le istruzioni specifiche.

ARTICOLO:
${articleContent.substring(0, 2000)}...

TITOLO ATTUALE: ${currentTitle}

ISTRUZIONI PER IL TITOLO:
${finalTitlePrompt}

Genera SOLO il titolo ottimizzato, senza spiegazioni aggiuntive.`;

    const titleResult = await this.openaiService.generateArticle({
      prompt: titleGenerationPrompt,
      model: 'gpt-4o-mini',
      parameters: {
        maxTokens: 100,
        temperature: 0.5,
      },
      metadata: {
        requestId: `step3a-${Date.now()}`
      }
    });

    if (titleResult.isFailure()) {
      return titleResult;
    }

    const optimizedTitle = titleResult.value.title || titleResult.value.content.trim();

    // Sub-step 3b: Generate SEO metadata
    const defaultSeoPrompt = 'Genera meta description (max 160 caratteri), tags pertinenti e parole chiave ottimizzate per i motori di ricerca. Fornisci anche un excerpt di 150 parole.';
    const finalSeoPrompt = seoPrompt || defaultSeoPrompt;

    const seoGenerationPrompt = `Genera metadati SEO per questo articolo seguendo le istruzioni specifiche.

TITOLO: ${optimizedTitle}

ARTICOLO:
${articleContent.substring(0, 3000)}...

ISTRUZIONI SEO:
${finalSeoPrompt}

Fornisci la risposta in formato JSON con questi campi:
{
  "metaDescription": "descrizione max 160 caratteri",
  "tags": ["tag1", "tag2", "tag3"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "excerpt": "excerpt di 150 parole"
}`;

    const seoResult = await this.openaiService.generateSeoMetadata({
      title: optimizedTitle,
      content: articleContent,
      targetKeywords: [],
      metaDescriptionLength: 160,
      metadata: {
        requestId: `step3b-${Date.now()}`
      }
    });

    if (seoResult.isFailure()) {
      return seoResult;
    }

    return Result.success({
      optimizedTitle,
      metaDescription: seoResult.value.metaDescription,
      seoTags: seoResult.value.focusKeywords,
      titleMetadata: titleResult.value.metadata,
      seoMetadata: seoResult.value.metadata
    });
  }

  /**
   * Extract sources/citations from Perplexity response
   */
  private extractSources(content: string): string[] {
    const sources: string[] = [];

    // Common patterns for citations in Perplexity responses
    const urlPattern = /https?:\/\/[^\s\)]+/g;
    const urls = content.match(urlPattern) || [];

    // Remove duplicates and clean URLs
    const uniqueUrls = [...new Set(urls.map(url => url.replace(/[.,;)]+$/, '')))];

    return uniqueUrls.slice(0, 10); // Limit to first 10 sources
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    const perplexityHealth = await this.perplexityService.getServiceHealth();
    const openaiHealth = await this.openaiService.getServiceHealth();

    return {
      perplexity: perplexityHealth.isSuccess() ? perplexityHealth.value : null,
      openai: openaiHealth.isSuccess() ? openaiHealth.value : null,
      isHealthy: perplexityHealth.isSuccess() && openaiHealth.isSuccess()
    };
  }
}