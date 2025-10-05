import { ValueObject } from '../../../../shared/domain/base/ValueObject';

export class PromptId extends ValueObject<string> {
  constructor(value: string) {
    super(value);
    this.validate();
  }

  static create(value: string): PromptId {
    return new PromptId(value);
  }

  static generate(): PromptId {
    return new PromptId(crypto.randomUUID());
  }

  protected validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('PromptId cannot be empty');
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(this.value)) {
      throw new Error('PromptId must be a valid UUID');
    }
  }
}