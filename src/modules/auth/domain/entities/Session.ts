import { Entity } from '@/shared/domain/base/Entity';
import { UserId } from '../value-objects/UserId';

export interface SessionProps {
  id: string;
  userId: UserId;
  sessionToken: string;
  expires: Date;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  lastAccessedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Session Entity
 * Represents an active user session in the system
 */
export class Session extends Entity<string> {
  private _userId: UserId;
  private _sessionToken: string;
  private _expires: Date;
  private _userAgent?: string;
  private _ipAddress?: string;
  private _isActive: boolean;
  private _lastAccessedAt?: Date;

  constructor(props: SessionProps) {
    super(props.id, props.createdAt, props.updatedAt);

    this._userId = props.userId;
    this._sessionToken = props.sessionToken;
    this._expires = props.expires;
    this._userAgent = props.userAgent;
    this._ipAddress = props.ipAddress;
    this._isActive = props.isActive;
    this._lastAccessedAt = props.lastAccessedAt;

    this.validateInvariants();
  }

  /**
   * Creates a new Session
   */
  static create(props: {
    userId: UserId;
    sessionToken: string;
    expires: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Session {
    const sessionId = this.generateSessionId();

    return new Session({
      id: sessionId,
      userId: props.userId,
      sessionToken: props.sessionToken,
      expires: props.expires,
      userAgent: props.userAgent,
      ipAddress: props.ipAddress,
      isActive: true,
      lastAccessedAt: new Date(),
    });
  }

  /**
   * Creates a Session from existing data (e.g., from database)
   */
  static fromData(props: SessionProps): Session {
    return new Session(props);
  }

  // Getters
  get userId(): UserId {
    return this._userId;
  }

  get sessionToken(): string {
    return this._sessionToken;
  }

  get expires(): Date {
    return new Date(this._expires);
  }

  get userAgent(): string | undefined {
    return this._userAgent;
  }

  get ipAddress(): string | undefined {
    return this._ipAddress;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get lastAccessedAt(): Date | undefined {
    return this._lastAccessedAt ? new Date(this._lastAccessedAt) : undefined;
  }

  // Business methods

  /**
   * Checks if the session is expired
   */
  isExpired(): boolean {
    return new Date() > this._expires;
  }

  /**
   * Checks if the session is valid (active and not expired)
   */
  isValid(): boolean {
    return this._isActive && !this.isExpired();
  }

  /**
   * Updates the last accessed timestamp
   */
  updateLastAccessed(): void {
    this._lastAccessedAt = new Date();
    this.markAsUpdated();
  }

  /**
   * Extends the session expiration time
   */
  extend(newExpires: Date): void {
    if (newExpires <= this._expires) {
      throw new Error('New expiration must be later than current expiration');
    }

    this._expires = newExpires;
    this.markAsUpdated();
  }

  /**
   * Invalidates the session
   */
  invalidate(): void {
    this._isActive = false;
    this.markAsUpdated();
  }

  /**
   * Checks if the session belongs to a specific user
   */
  belongsToUser(userId: UserId): boolean {
    return this._userId.equals(userId);
  }

  /**
   * Checks if the session was created from a specific IP
   */
  isFromIp(ipAddress: string): boolean {
    return this._ipAddress === ipAddress;
  }

  /**
   * Validates business invariants
   */
  private validateInvariants(): void {
    if (!this._userId) {
      throw new Error('Session must have a user ID');
    }

    if (!this._sessionToken || this._sessionToken.length < 10) {
      throw new Error('Session must have a valid session token');
    }

    if (!this._expires) {
      throw new Error('Session must have an expiration date');
    }

    if (this._expires <= new Date()) {
      throw new Error('Session expiration must be in the future');
    }
  }

  /**
   * Generates a unique session ID
   */
  private static generateSessionId(): string {
    // Generate a random session ID
    const timestamp = Date.now().toString(36);
    const randomBytes = Math.random().toString(36).substring(2);
    return `sess_${timestamp}_${randomBytes}`;
  }

  /**
   * Converts to JSON for serialization
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      userId: this._userId.getValue(),
      sessionToken: this._sessionToken,
      expires: this._expires,
      userAgent: this._userAgent,
      ipAddress: this._ipAddress,
      isActive: this._isActive,
      lastAccessedAt: this._lastAccessedAt,
    };
  }
}