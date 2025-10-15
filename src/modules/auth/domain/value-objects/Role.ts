import { StringValueObject } from '@/shared/domain/base/ValueObject';

/**
 * Predefined system roles
 */
export enum SystemRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  API_CLIENT = 'api_client',
}

/**
 * Role Value Object
 * Represents a user role in the system with strict validation
 */
export class Role extends StringValueObject {
  private static readonly VALID_ROLES = Object.values(SystemRole);
  private static readonly CUSTOM_ROLE_PREFIX = 'custom_';
  private static readonly MAX_LENGTH = 50;

  protected validate(value: string): void {
    this.validateNotEmpty(value);

    // Check max length on the input value, not this.value
    if (value.length > Role.MAX_LENGTH) {
      throw new Error(`Role cannot exceed ${Role.MAX_LENGTH} characters`);
    }

    const normalizedValue = value.toLowerCase();

    // Check if it's a system role or valid custom role
    if (!this.isValidRole(normalizedValue)) {
      throw new Error(
        `Invalid role: ${value}. Must be one of: ${Role.VALID_ROLES.join(', ')} or start with '${Role.CUSTOM_ROLE_PREFIX}'`
      );
    }
  }

  private isValidRole(value: string): boolean {
    // Check if it's a predefined system role
    if (Role.VALID_ROLES.includes(value as SystemRole)) {
      return true;
    }

    // Check if it's a valid custom role
    if (value.startsWith(Role.CUSTOM_ROLE_PREFIX) && value.length > Role.CUSTOM_ROLE_PREFIX.length) {
      const customPart = value.substring(Role.CUSTOM_ROLE_PREFIX.length);
      return /^[a-z0-9_]+$/.test(customPart);
    }

    return false;
  }

  /**
   * Creates a Role from a string value
   */
  static create(value: string): Role {
    return new Role(value.toLowerCase().trim());
  }

  /**
   * Creates an admin role
   */
  static admin(): Role {
    return new Role(SystemRole.ADMIN);
  }

  /**
   * Creates an editor role
   */
  static editor(): Role {
    return new Role(SystemRole.EDITOR);
  }

  /**
   * Creates a viewer role
   */
  static viewer(): Role {
    return new Role(SystemRole.VIEWER);
  }

  /**
   * Creates an API client role
   */
  static apiClient(): Role {
    return new Role(SystemRole.API_CLIENT);
  }

  /**
   * Creates a custom role
   */
  static custom(name: string): Role {
    return new Role(`${Role.CUSTOM_ROLE_PREFIX}${name.toLowerCase()}`);
  }

  /**
   * Checks if this is an admin role
   */
  isAdmin(): boolean {
    return this.value === SystemRole.ADMIN;
  }

  /**
   * Checks if this is an editor role
   */
  isEditor(): boolean {
    return this.value === SystemRole.EDITOR;
  }

  /**
   * Checks if this is a viewer role
   */
  isViewer(): boolean {
    return this.value === SystemRole.VIEWER;
  }

  /**
   * Checks if this is an API client role
   */
  isApiClient(): boolean {
    return this.value === SystemRole.API_CLIENT;
  }

  /**
   * Checks if this is a custom role
   */
  isCustom(): boolean {
    return this.value.startsWith(Role.CUSTOM_ROLE_PREFIX);
  }

  /**
   * Checks if this role has higher or equal priority than another role
   */
  hasHigherOrEqualPriorityThan(other: Role): boolean {
    const priorities: Record<string, number> = {
      [SystemRole.ADMIN]: 100,
      [SystemRole.EDITOR]: 50,
      [SystemRole.VIEWER]: 10,
      [SystemRole.API_CLIENT]: 5,
    };

    const thisPriority = priorities[this.value] || 1; // Custom roles have lowest priority
    const otherPriority = priorities[other.value] || 1;

    return thisPriority >= otherPriority;
  }
}