export class SiteId {
  private constructor(private readonly value: string) {}

  static create(value: string): SiteId {
    if (!value || value.trim().length === 0) {
      throw new Error('SiteId cannot be empty');
    }
    return new SiteId(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: SiteId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}