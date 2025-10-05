import { UseCase } from '../../../../shared/application/base/UseCase';
import { Result } from '../../../../shared/domain/types/Result';
import { ImagePrompt } from '../../domain/entities/ImagePrompt';
import { IPromptEngineeringService } from '../ports/IPromptEngineeringService';
import { IImagePromptRepository } from '../ports/IImagePromptRepository';

export interface GenerateImagePromptRequest {
  articleId: string;
  articleTitle: string;
  articleContent: string;
  template?: string;
  aiModel?: string;
}

export interface GenerateImagePromptResponse {
  promptId: string;
  articleId: string;
  generatedPrompt: string;
  status: string;
  metadata?: Record<string, any>;
}

/**
 * Generate Image Prompt Use Case
 *
 * Uses AI (ChatGPT) to generate optimized prompts for DALL-E image generation
 * based on article content and title.
 */
export class GenerateImagePrompt extends UseCase<GenerateImagePromptRequest, GenerateImagePromptResponse> {
  constructor(
    private readonly promptEngineeringService: IPromptEngineeringService,
    private readonly imagePromptRepository: IImagePromptRepository
  ) {
    super();
  }

  protected async executeImpl(request: GenerateImagePromptRequest): Promise<Result<GenerateImagePromptResponse>> {
    try {
      // Validate input
      if (!request.articleTitle?.trim()) {
        return Result.fail('Article title is required');
      }

      if (!request.articleContent?.trim()) {
        return Result.fail('Article content is required');
      }

      // Create excerpt from content (first 500 chars)
      const articleExcerpt = this.createExcerpt(request.articleContent);

      // Use default template if not provided
      const template = request.template || this.getDefaultTemplate();
      const aiModel = request.aiModel || 'gpt-4';

      // Create ImagePrompt entity
      const imagePrompt = ImagePrompt.create(
        request.articleId,
        request.articleTitle,
        articleExcerpt,
        template,
        aiModel
      );

      // Generate prompt using AI service
      const promptResult = await this.promptEngineeringService.generateImagePrompt({
        title: request.articleTitle,
        content: articleExcerpt,
        template,
        model: aiModel,
      });

      if (promptResult.isFailure()) {
        imagePrompt.markAsFailed(promptResult.error);
        await this.imagePromptRepository.save(imagePrompt);
        return Result.fail(`Failed to generate prompt: ${promptResult.error}`);
      }

      // Mark as generated and validate
      const { promptText, metadata } = promptResult.getValue();
      imagePrompt.markAsGenerated(promptText, metadata);
      imagePrompt.markAsValidated(); // Auto-validate AI-generated prompts

      // Save to repository
      await this.imagePromptRepository.save(imagePrompt);

      // Return response
      return Result.ok({
        promptId: imagePrompt.id.getValue(),
        articleId: imagePrompt.articleId,
        generatedPrompt: imagePrompt.getPromptForDallE(),
        status: imagePrompt.status,
        metadata: imagePrompt.metadata,
      });

    } catch (error) {
      return Result.fail(`Unexpected error in GenerateImagePrompt: ${error}`);
    }
  }

  /**
   * Create excerpt from article content
   */
  private createExcerpt(content: string): string {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
    return cleanContent.length > 500
      ? cleanContent.substring(0, 500) + '...'
      : cleanContent;
  }

  /**
   * Get default template for prompt engineering
   */
  private getDefaultTemplate(): string {
    return `Analizza questo articolo e crea un prompt per DALL-E 3 che generi un'immagine professionale e pertinente.

TITOLO: {title}
CONTENUTO: {content}

REQUISITI per il prompt:
- Massimo 400 caratteri
- Stile fotografico professionale e pulito
- Evita linguaggio imperativo o restrittivo
- Usa descrizioni naturali e creative
- Focus su una scena semplice e rilevante al contenuto
- Adatto per un articolo di business/tecnologia

FORMATO RISPOSTA: Solo il prompt per DALL-E, senza spiegazioni aggiuntive.

ESEMPIO di buon prompt: "Professional office setting with a person working on a laptop, soft natural lighting, clean modern desk, focused atmosphere, business photography style"

Crea il prompt:`;
  }
}