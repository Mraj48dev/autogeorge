export enum SiteStatusType {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  PUBLISHING = 'publishing'
}

export class SiteStatus {
  private constructor(
    private readonly status: SiteStatusType,
    private readonly lastError?: string,
    private readonly lastPublishAt?: Date
  ) {}

  static active(): SiteStatus {
    return new SiteStatus(SiteStatusType.ACTIVE);
  }

  static inactive(): SiteStatus {
    return new SiteStatus(SiteStatusType.INACTIVE);
  }

  static error(errorMessage: string): SiteStatus {
    return new SiteStatus(SiteStatusType.ERROR, errorMessage);
  }

  static publishing(): SiteStatus {
    return new SiteStatus(SiteStatusType.PUBLISHING);
  }

  static fromData(status: string, lastError?: string, lastPublishAt?: Date): SiteStatus {
    const statusType = Object.values(SiteStatusType).includes(status as SiteStatusType)
      ? status as SiteStatusType
      : SiteStatusType.INACTIVE;

    return new SiteStatus(statusType, lastError, lastPublishAt);
  }

  getStatus(): SiteStatusType {
    return this.status;
  }

  getLastError(): string | undefined {
    return this.lastError;
  }

  getLastPublishAt(): Date | undefined {
    return this.lastPublishAt;
  }

  isActive(): boolean {
    return this.status === SiteStatusType.ACTIVE;
  }

  isPublishing(): boolean {
    return this.status === SiteStatusType.PUBLISHING;
  }

  hasError(): boolean {
    return this.status === SiteStatusType.ERROR;
  }

  toString(): string {
    return this.status;
  }

  equals(other: SiteStatus): boolean {
    return this.status === other.status &&
           this.lastError === other.lastError;
  }
}