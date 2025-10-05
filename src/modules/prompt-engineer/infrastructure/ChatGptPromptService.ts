import { IPromptEngineeringService, PromptGenerationRequest, PromptGenerationResult } from '../application/ports/IPromptEngineeringService';
import { Result } from '../../../shared/domain/types/Result';

/**
 * ChatGPT implementation of prompt engineering service
 */
export class ChatGptPromptService implements IPromptEngineeringService {
  private readonly apiKey: string;
  private readonly baseUrl: string = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImagePrompt(request: PromptGenerationRequest): Promise<Result<PromptGenerationResult>> {
    try {
      const startTime = Date.now();

      // Prepare the prompt template with article data
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(request.title, request.content, request.template);

      // Call ChatGPT API
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: request.maxTokens || 500,
          temperature: request.temperature || 0.7,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return Result.fail(`ChatGPT API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      if (!data.choices || data.choices.length === 0) {
        return Result.fail('No response generated from ChatGPT');
      }

      const generatedPrompt = data.choices[0].message.content.trim();

      // Validate generated prompt
      if (!generatedPrompt || generatedPrompt.length < 10) {
        return Result.fail('Generated prompt is too short or empty');
      }

      // Clean the prompt (remove quotes, extra whitespace)
      const cleanedPrompt = this.cleanGeneratedPrompt(generatedPrompt);

      const processingTime = Date.now() - startTime;

      return Result.ok({
        promptText: cleanedPrompt,
        metadata: {
          tokensUsed: data.usage?.total_tokens,
          model: request.model,
          processingTime,
          confidence: this.calculateConfidence(cleanedPrompt),
          originalResponse: generatedPrompt,
        },
      });

    } catch (error) {
      return Result.fail(`Error calling ChatGPT API: ${error}`);
    }
  }

  async healthCheck(): Promise<Result<boolean>> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return Result.ok(response.ok);
    } catch (error) {
      return Result.fail(`Health check failed: ${error}`);
    }
  }

  getAvailableModels(): string[] {
    return ['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'];
  }

  /**
   * Build system prompt for ChatGPT
   */
  private buildSystemPrompt(): string {
    return `You are an expert prompt engineer specializing in creating optimized prompts for DALL-E 3 image generation.

Your task is to transform article content into concise, effective DALL-E prompts that will generate professional, relevant images.

IMPORTANT GUIDELINES:
- Keep prompts under 400 characters
- Use descriptive, natural language (avoid commands or restrictions)
- Focus on visual elements: composition, lighting, style, mood
- Prefer "professional photography" or "business photography" style
- Avoid negative instructions (don't say what NOT to include)
- Make prompts specific enough to be relevant but general enough to avoid content policy issues

GOOD PROMPT EXAMPLE: "Professional office setting with person working on laptop, natural lighting from window, clean modern desk, focused business atmosphere, corporate photography style"

BAD PROMPT EXAMPLE: "DO NOT create complex compositions. MUST show only one person. FORBIDDEN to add decorative objects."

Always respond with ONLY the optimized prompt text, no explanations or additional text.`;
  }

  /**
   * Build user prompt with article context
   */
  private buildUserPrompt(title: string, content: string, template: string): string {
    // Replace placeholders in template
    const processedTemplate = template
      .replace('{title}', title)
      .replace('{content}', content);

    return processedTemplate;
  }

  /**
   * Clean the generated prompt from ChatGPT
   */
  private cleanGeneratedPrompt(prompt: string): string {
    return prompt
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate confidence score based on prompt characteristics
   */
  private calculateConfidence(prompt: string): number {
    let score = 70; // Base score

    // Length check
    if (prompt.length >= 50 && prompt.length <= 400) {
      score += 10;
    }

    // Professional keywords
    const professionalKeywords = ['professional', 'business', 'corporate', 'clean', 'modern'];
    const foundProfessional = professionalKeywords.some(keyword =>
      prompt.toLowerCase().includes(keyword)
    );
    if (foundProfessional) score += 10;

    // Photography style
    if (prompt.toLowerCase().includes('photography')) {
      score += 5;
    }

    // Lighting mentioned
    if (prompt.toLowerCase().includes('lighting') || prompt.toLowerCase().includes('light')) {
      score += 5;
    }

    // Avoid problematic patterns
    const problematicPatterns = [/\b(don't|not|no|never)\b/gi, /\b(must|should|required)\b/gi];
    const hasProblematic = problematicPatterns.some(pattern => pattern.test(prompt));
    if (hasProblematic) score -= 15;

    return Math.min(100, Math.max(0, score));
  }
}