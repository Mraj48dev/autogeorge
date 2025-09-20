import { ValueObject } from '../../shared/domain/base/ValueObject';

/**
 * Source URL value object
 * Validates and normalizes source URLs based on source type
 */
export class SourceUrl extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Source URL cannot be empty');
    }

    const trimmed = value.trim();

    // Basic URL validation
    try {
      new URL(trimmed);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Check protocol
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      throw new Error('URL must use HTTP or HTTPS protocol');
    }

    if (trimmed.length > 2000) {
      throw new Error('URL is too long (max 2000 characters)');
    }
  }

  constructor(value: string) {
    super(value.trim());
  }

  static fromString(value: string): SourceUrl {
    return new SourceUrl(value);
  }

  getDomain(): string {
    try {
      const url = new URL(this._value);
      return url.hostname;
    } catch {
      return '';
    }
  }

  getPath(): string {
    try {
      const url = new URL(this._value);
      return url.pathname;
    } catch {
      return '';
    }
  }

  getProtocol(): string {
    try {
      const url = new URL(this._value);
      return url.protocol;
    } catch {
      return '';
    }
  }

  isSecure(): boolean {
    return this.getProtocol() === 'https:';
  }

  isRssLike(): boolean {
    const path = this.getPath().toLowerCase();
    const url = this._value.toLowerCase();

    return (
      path.includes('rss') ||
      path.includes('feed') ||
      path.includes('.xml') ||
      url.includes('rss') ||
      url.includes('feed')
    );
  }

  isTelegramChannel(): boolean {
    const domain = this.getDomain().toLowerCase();
    return domain === 't.me' || domain === 'telegram.me';
  }

  normalize(): SourceUrl {
    let normalized = this._value;

    // Remove trailing slash
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    // Convert to lowercase domain
    try {
      const url = new URL(normalized);
      url.hostname = url.hostname.toLowerCase();
      normalized = url.toString();
    } catch {
      // If URL parsing fails, return as is
    }

    return new SourceUrl(normalized);
  }

  toString(): string {
    return this._value;
  }
}