export interface User {
  readonly id: string;
  readonly email: string;
  readonly name?: string;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly lastLoginAt?: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly role: UserRole,
    public readonly name?: string,
    public readonly createdAt: Date = new Date(),
    public readonly lastLoginAt?: Date
  ) {}

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  canEdit(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.EDITOR;
  }

  canView(): boolean {
    return Object.values(UserRole).includes(this.role);
  }

  static fromData(data: User): UserEntity {
    return new UserEntity(
      data.id,
      data.email,
      data.role,
      data.name,
      data.createdAt,
      data.lastLoginAt
    );
  }

  toData(): User {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      createdAt: this.createdAt,
      lastLoginAt: this.lastLoginAt
    };
  }
}