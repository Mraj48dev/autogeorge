import { ValueObject } from '@/shared/domain/base/ValueObject';
import { Result } from '@/shared/domain/types/Result';

export interface UserIdProps {
  value: string;
}

export class UserId extends ValueObject<UserIdProps> {
  get value(): string {
    return this.props.value;
  }

  public static create(id: string): Result<UserId> {
    if (!id) {
      return Result.failure('User ID cannot be empty');
    }

    if (id.length < 1) {
      return Result.failure('User ID is too short');
    }

    return Result.success(new UserId({ value: id }));
  }

  public static generate(): UserId {
    // Using simple timestamp + random for demo
    // In production, consider using cuid or uuid
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return new UserId({ value: `user_${timestamp}${random}` });
  }

  public toString(): string {
    return this.value;
  }
}