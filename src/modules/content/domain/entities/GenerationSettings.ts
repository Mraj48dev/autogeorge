import { AggregateRoot } from '../../shared/domain/base/Entity';
import { Result } from '../../shared/domain/types/Result';

/**
 * Generation Settings entity for managing article generation prompts and configuration
 */
export class GenerationSettings extends AggregateRoot<GenerationSettingsId> {
  private _userId: string;
  private _titlePrompt: string;
  private _contentPrompt: string;
  private _seoPrompt: string;
  private _defaultModel: string;
  private _defaultTemperature: number;
  private _defaultMaxTokens: number;
  private _defaultLanguage: string;
  private _defaultTone: string;
  private _defaultStyle: string;
  private _defaultTargetAudience: string;

  constructor(
    id: GenerationSettingsId,
    userId: string,
    titlePrompt: string,
    contentPrompt: string,
    seoPrompt: string,
    defaultModel: string = 'gpt-4',
    defaultTemperature: number = 0.7,
    defaultMaxTokens: number = 2000,
    defaultLanguage: string = 'it',
    defaultTone: string = 'professionale',
    defaultStyle: string = 'giornalistico',
    defaultTargetAudience: string = 'generale',
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, createdAt, updatedAt);
    this._userId = userId;
    this._titlePrompt = titlePrompt;
    this._contentPrompt = contentPrompt;
    this._seoPrompt = seoPrompt;
    this._defaultModel = defaultModel;
    this._defaultTemperature = defaultTemperature;
    this._defaultMaxTokens = defaultMaxTokens;
    this._defaultLanguage = defaultLanguage;
    this._defaultTone = defaultTone;
    this._defaultStyle = defaultStyle;
    this._defaultTargetAudience = defaultTargetAudience;

    this.validateInvariants();
  }

  static create(
    userId: string,
    titlePrompt?: string,
    contentPrompt?: string,
    seoPrompt?: string
  ): Result<GenerationSettings> {
    try {
      const defaultTitlePrompt = titlePrompt ||
        'Crea un titolo accattivante e SEO-friendly per questo articolo. Il titolo deve essere chiaro, informativo e ottimizzato per i motori di ricerca.';

      const defaultContentPrompt = contentPrompt ||
        'Scrivi un articolo completo e ben strutturato basato su questo contenuto. L\'articolo deve essere originale, coinvolgente e ben formattato con paragrafi chiari.';

      const defaultSeoPrompt = seoPrompt ||
        'Includi meta description (max 160 caratteri), tags pertinenti e parole chiave ottimizzate per i motori di ricerca. Fornisci anche un excerpt di 150 parole.';

      const id = GenerationSettingsId.generate();

      const settings = new GenerationSettings(
        id,
        userId,
        defaultTitlePrompt,
        defaultContentPrompt,
        defaultSeoPrompt
      );

      return Result.success(settings);
    } catch (error) {
      return Result.failure(`Failed to create generation settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Getters
  get userId(): string {
    return this._userId;
  }

  get titlePrompt(): string {
    return this._titlePrompt;
  }

  get contentPrompt(): string {
    return this._contentPrompt;
  }

  get seoPrompt(): string {
    return this._seoPrompt;
  }

  get defaultModel(): string {
    return this._defaultModel;
  }

  get defaultTemperature(): number {
    return this._defaultTemperature;
  }

  get defaultMaxTokens(): number {
    return this._defaultMaxTokens;
  }

  get defaultLanguage(): string {
    return this._defaultLanguage;
  }

  get defaultTone(): string {
    return this._defaultTone;
  }

  get defaultStyle(): string {
    return this._defaultStyle;
  }

  get defaultTargetAudience(): string {
    return this._defaultTargetAudience;
  }

  // Update methods
  updatePrompts(titlePrompt: string, contentPrompt: string, seoPrompt: string): void {
    this._titlePrompt = titlePrompt;
    this._contentPrompt = contentPrompt;
    this._seoPrompt = seoPrompt;
    this.markAsUpdated();
    this.validateInvariants();
  }

  updateModelSettings(
    model: string,
    temperature: number,
    maxTokens: number
  ): void {
    this._defaultModel = model;
    this._defaultTemperature = temperature;
    this._defaultMaxTokens = maxTokens;
    this.markAsUpdated();
    this.validateInvariants();
  }

  updateLanguageSettings(
    language: string,
    tone: string,
    style: string,
    targetAudience: string
  ): void {
    this._defaultLanguage = language;
    this._defaultTone = tone;
    this._defaultStyle = style;
    this._defaultTargetAudience = targetAudience;
    this.markAsUpdated();
  }

  /**
   * Returns the complete settings for article generation
   */
  getGenerationConfig(): GenerationConfig {
    return {
      prompts: {
        titlePrompt: this._titlePrompt,
        contentPrompt: this._contentPrompt,
        seoPrompt: this._seoPrompt
      },
      modelSettings: {
        model: this._defaultModel,
        temperature: this._defaultTemperature,
        maxTokens: this._defaultMaxTokens
      },
      languageSettings: {
        language: this._defaultLanguage,
        tone: this._defaultTone,
        style: this._defaultStyle,
        targetAudience: this._defaultTargetAudience
      }
    };
  }

  protected validateInvariants(): void {
    if (!this._userId) {
      throw new Error('Generation settings must have a user ID');
    }

    if (!this._titlePrompt || this._titlePrompt.length < 10) {
      throw new Error('Title prompt must be at least 10 characters long');
    }

    if (!this._contentPrompt || this._contentPrompt.length < 10) {
      throw new Error('Content prompt must be at least 10 characters long');
    }

    if (!this._seoPrompt || this._seoPrompt.length < 10) {
      throw new Error('SEO prompt must be at least 10 characters long');
    }

    if (this._defaultTemperature < 0 || this._defaultTemperature > 2) {
      throw new Error('Temperature must be between 0 and 2');
    }

    if (this._defaultMaxTokens < 100 || this._defaultMaxTokens > 8000) {
      throw new Error('Max tokens must be between 100 and 8000');
    }
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      userId: this._userId,
      titlePrompt: this._titlePrompt,
      contentPrompt: this._contentPrompt,
      seoPrompt: this._seoPrompt,
      defaultModel: this._defaultModel,
      defaultTemperature: this._defaultTemperature,
      defaultMaxTokens: this._defaultMaxTokens,
      defaultLanguage: this._defaultLanguage,
      defaultTone: this._defaultTone,
      defaultStyle: this._defaultStyle,
      defaultTargetAudience: this._defaultTargetAudience
    };
  }
}

/**
 * Value object for Generation Settings ID
 */
export class GenerationSettingsId {
  private constructor(private readonly value: string) {}

  static create(value: string): Result<GenerationSettingsId> {
    if (!value || value.trim().length === 0) {
      return Result.failure('Generation Settings ID cannot be empty');
    }
    return Result.success(new GenerationSettingsId(value));
  }

  static generate(): GenerationSettingsId {
    return new GenerationSettingsId(crypto.randomUUID());
  }

  getValue(): string {
    return this.value;
  }

  equals(other: GenerationSettingsId): boolean {
    return this.value === other.value;
  }
}

export interface GenerationConfig {
  prompts: {
    titlePrompt: string;
    contentPrompt: string;
    seoPrompt: string;
  };
  modelSettings: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  languageSettings: {
    language: string;
    tone: string;
    style: string;
    targetAudience: string;
  };
}