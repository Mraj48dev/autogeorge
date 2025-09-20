import { ValueObject } from '../../shared/domain/base/ValueObject';

/**
 * Source type value object
 * Defines valid source types and their characteristics
 */
export class SourceType extends ValueObject<string> {
  private static readonly VALID_TYPES = ['rss', 'telegram', 'calendar'] as const;

  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Source type cannot be empty');
    }

    const normalizedValue = value.toLowerCase().trim();
    if (!SourceType.VALID_TYPES.includes(normalizedValue as any)) {
      throw new Error(`Invalid source type: ${value}. Valid types: ${SourceType.VALID_TYPES.join(', ')}`);
    }
  }

  constructor(value: string) {
    super(value.toLowerCase().trim());
  }

  static rss(): SourceType {
    return new SourceType('rss');
  }

  static telegram(): SourceType {
    return new SourceType('telegram');
  }

  static calendar(): SourceType {
    return new SourceType('calendar');
  }

  static fromString(value: string): SourceType {
    return new SourceType(value);
  }

  isRss(): boolean {
    return this._value === 'rss';
  }

  isTelegram(): boolean {
    return this._value === 'telegram';
  }

  isCalendar(): boolean {
    return this._value === 'calendar';
  }

  getDisplayName(): string {
    switch (this._value) {
      case 'rss':
        return 'RSS Feed';
      case 'telegram':
        return 'Telegram Channel';
      case 'calendar':
        return 'Calendar Event';
      default:
        return this._value;
    }
  }

  requiresUrl(): boolean {
    return this._value === 'rss' || this._value === 'telegram';
  }

  getValidUrlPattern(): RegExp | null {
    switch (this._value) {
      case 'rss':
        // More flexible RSS pattern - accepts any HTTPS/HTTP URL
        // RSS feeds can have various formats, not just .xml/.rss/.feed extensions
        return /^https?:\/\/.+/i;
      case 'telegram':
        return /^https?:\/\/(t\.me|telegram\.me)\/.+$/i;
      default:
        return null;
    }
  }
}