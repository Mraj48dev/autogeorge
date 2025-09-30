import { Result } from '../../shared/domain/types/Result';
import { ArticleAutoGenerator, AutoGenerateFromFeedItemsRequest, AutoGenerateFromFeedItemsResponse } from '../../domain/ports/ArticleAutoGenerator';
import { FeedItemRepository } from '../../domain/ports/FeedItemRepository';
import { createContentContainer } from '../../../content/infrastructure/container/ContentContainer';

/**
 * Adapter that bridges the sources module to the content module
 * for automatic article generation functionality.
 *
 * Also responsible for updating feed item status after successful generation.
 */
export class ContentModuleArticleAutoGenerator implements ArticleAutoGenerator {

  constructor(private readonly feedItemRepository: FeedItemRepository) {}

  async generateFromFeedItems(request: AutoGenerateFromFeedItemsRequest): Promise<Result<AutoGenerateFromFeedItemsResponse, Error>> {
    try {
      console.log(`🤖 [ContentModuleArticleAutoGenerator] Starting auto-generation for ${request.feedItems.length} feed items from source ${request.sourceId}`);

      // Get default generation settings if not provided
      const generationSettings = request.generationSettings || await this.getDefaultGenerationSettings();

      // Create content container and get auto-generate use case
      const contentContainer = createContentContainer();
      const autoGenerateUseCase = contentContainer.autoGenerateArticles;

      // Convert request to content module format
      const contentModuleRequest = {
        sourceId: request.sourceId,
        feedItems: request.feedItems.map(item => ({
          id: item.id,
          title: item.title,
          content: item.content,
          url: item.url,
          publishedAt: item.publishedAt
        })),
        generationSettings,
        enableFeaturedImage: request.enableFeaturedImage,
        enableAutoPublish: request.enableAutoPublish
      };

      console.log(`📤 [ContentModuleArticleAutoGenerator] Sending request to AutoGenerateArticles use case:`, {
        sourceId: request.sourceId,
        feedItemsCount: request.feedItems.length,
        hasGenerationSettings: !!request.generationSettings
      });

      // Execute auto-generation
      const result = await autoGenerateUseCase.execute(contentModuleRequest);

      if (result.isFailure()) {
        console.error(`❌ [ContentModuleArticleAutoGenerator] Auto-generation failed:`, result.error);
        return Result.failure(new Error(`Auto-generation failed: ${result.error}`));
      }

      const contentResult = result.value;

      // 🔄 UPDATE FEED ITEM STATUS: Content Module responsibility
      // After successful article generation, update feed items from 'draft' to 'processed'
      console.log(`🔄 [ContentModuleArticleAutoGenerator] Updating feed item status after generation...`);

      let statusUpdates = 0;
      for (const generationResult of contentResult.results) {
        if (generationResult.success && generationResult.articleId) {
          try {
            // Update feed item status from 'draft' to 'processed'
            const updateResult = await this.feedItemRepository.updateStatus(
              generationResult.feedItemId,
              'processed',
              generationResult.articleId
            );

            if (updateResult.isSuccess()) {
              statusUpdates++;
              console.log(`✅ [ContentModuleArticleAutoGenerator] Updated feed item ${generationResult.feedItemId} → status: processed, articleId: ${generationResult.articleId}`);
            } else {
              console.error(`❌ [ContentModuleArticleAutoGenerator] Failed to update feed item ${generationResult.feedItemId} status:`, updateResult.error);
            }
          } catch (error) {
            console.error(`💥 [ContentModuleArticleAutoGenerator] Error updating feed item ${generationResult.feedItemId} status:`, error);
          }
        } else {
          console.log(`⚠️ [ContentModuleArticleAutoGenerator] Skipping status update for failed generation: ${generationResult.feedItemId}`);
        }
      }

      console.log(`📊 [ContentModuleArticleAutoGenerator] Status updates completed: ${statusUpdates}/${contentResult.results.length} feed items updated`);

      // Convert response back to sources module format
      const sourcesModuleResponse: AutoGenerateFromFeedItemsResponse = {
        generatedArticles: contentResult.results.map(r => ({
          feedItemId: r.feedItemId,
          articleId: r.articleId,
          success: r.success,
          error: r.error
        })),
        summary: contentResult.summary
      };

      console.log(`✅ [ContentModuleArticleAutoGenerator] Auto-generation completed:`, {
        sourceId: request.sourceId,
        total: sourcesModuleResponse.summary.total,
        successful: sourcesModuleResponse.summary.successful,
        failed: sourcesModuleResponse.summary.failed,
        statusUpdatesApplied: statusUpdates
      });

      return Result.success(sourcesModuleResponse);

    } catch (error) {
      console.error(`💥 [ContentModuleArticleAutoGenerator] Unexpected error:`, error);
      return Result.failure(error instanceof Error ? error : new Error('Unknown auto-generation error'));
    }
  }

  private async getDefaultGenerationSettings() {
    // For now, return basic defaults. In the future, this could be fetched from user settings
    return {
      titlePrompt: 'Crea un titolo accattivante e SEO-friendly per questo articolo',
      contentPrompt: 'Scrivi un articolo completo e ben strutturato basato su questo contenuto',
      seoPrompt: 'Includi meta description, tags e parole chiave ottimizzate per i motori di ricerca',
      model: 'sonar', // Use Perplexity model instead of GPT-4
      temperature: 0.7,
      maxTokens: 2000,
      language: 'it',
      tone: 'professionale',
      style: 'giornalistico',
      targetAudience: 'generale'
    };
  }
}