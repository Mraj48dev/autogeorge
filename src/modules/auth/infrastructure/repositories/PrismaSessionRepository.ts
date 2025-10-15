import { PrismaClient, Session as PrismaSession } from '@prisma/client';
import { Session } from '../../domain/entities/Session';
import { UserId } from '../../domain/value-objects/UserId';
import { ISessionRepository } from '../../application/use-cases/AuthenticateUser';

/**
 * Prisma implementation of Session Repository
 * Maps between domain entities and Prisma models
 */
export class PrismaSessionRepository implements ISessionRepository {
  constructor(private prisma: PrismaClient) {}

  async save(session: Session): Promise<void> {
    const prismaData = this.toPrismaModel(session);

    await this.prisma.session.upsert({
      where: { id: session.id },
      update: {
        expires: prismaData.expires,
      },
      create: {
        id: prismaData.id,
        sessionToken: prismaData.sessionToken,
        userId: prismaData.userId,
        expires: prismaData.expires,
      },
    });

    // Save additional session metadata if needed
    await this.saveSessionMetadata(session);
  }

  async findById(sessionId: string): Promise<Session | null> {
    const prismaSession = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!prismaSession) {
      return null;
    }

    return this.toDomainEntity(prismaSession);
  }

  async findBySessionToken(sessionToken: string): Promise<Session | null> {
    const prismaSession = await this.prisma.session.findUnique({
      where: { sessionToken },
    });

    if (!prismaSession) {
      return null;
    }

    return this.toDomainEntity(prismaSession);
  }

  async findActiveByUserId(userId: UserId): Promise<Session[]> {
    const prismaSessions = await this.prisma.session.findMany({
      where: {
        userId: userId.getValue(),
        expires: {
          gt: new Date(), // Only active (not expired) sessions
        },
      },
      orderBy: { expires: 'desc' },
    });

    return Promise.all(
      prismaSessions.map(prismaSession => this.toDomainEntity(prismaSession))
    );
  }

  async invalidateUserSessions(userId: UserId): Promise<void> {
    // Delete all sessions for the user
    await this.prisma.session.deleteMany({
      where: { userId: userId.getValue() },
    });

    // Also clean up session metadata
    await this.cleanupSessionMetadata(userId.getValue());
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.prisma.session.delete({
      where: { id: sessionId },
    });

    await this.cleanupSessionMetadataById(sessionId);
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expires: {
          lte: new Date(),
        },
      },
    });

    return result.count;
  }

  async getUserSessionCount(userId: UserId): Promise<number> {
    return this.prisma.session.count({
      where: {
        userId: userId.getValue(),
        expires: {
          gt: new Date(),
        },
      },
    });
  }

  /**
   * Converts Prisma Session model to Domain Session entity
   */
  private async toDomainEntity(prismaSession: PrismaSession): Promise<Session> {
    // Load session metadata
    const metadata = await this.loadSessionMetadata(prismaSession.id);

    const session = Session.fromData({
      id: prismaSession.id,
      userId: UserId.create(prismaSession.userId),
      sessionToken: prismaSession.sessionToken,
      expires: prismaSession.expires,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      isActive: metadata.isActive ?? true,
      lastAccessedAt: metadata.lastAccessedAt,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
    });

    return session;
  }

  /**
   * Converts Domain Session entity to Prisma Session model data
   */
  private toPrismaModel(session: Session): any {
    return {
      id: session.id,
      sessionToken: session.sessionToken,
      userId: session.userId.getValue(),
      expires: session.expires,
    };
  }

  /**
   * Loads session metadata (userAgent, ipAddress, etc.)
   */
  private async loadSessionMetadata(sessionId: string): Promise<{
    userAgent?: string;
    ipAddress?: string;
    isActive?: boolean;
    lastAccessedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }> {
    try {
      // For now, return defaults
      // In a production system, this would load from a SessionMetadata table

      return {
        userAgent: undefined,
        ipAddress: undefined,
        isActive: true,
        lastAccessedAt: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      return {
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Saves session metadata
   */
  private async saveSessionMetadata(session: Session): Promise<void> {
    try {
      const metadata = {
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        isActive: session.isActive,
        lastAccessedAt: session.lastAccessedAt,
        updatedAt: new Date(),
      };

      // TODO: Implement proper metadata table storage
      console.log(`Saving session metadata for ${session.id}:`, metadata);

    } catch (error) {
      console.error('Failed to save session metadata:', error);
    }
  }

  /**
   * Cleans up session metadata for a user
   */
  private async cleanupSessionMetadata(userId: string): Promise<void> {
    try {
      // TODO: Clean up from SessionMetadata table when implemented
      console.log(`Cleaning up session metadata for user ${userId}`);
    } catch (error) {
      console.error('Failed to cleanup session metadata:', error);
    }
  }

  /**
   * Cleans up session metadata by session ID
   */
  private async cleanupSessionMetadataById(sessionId: string): Promise<void> {
    try {
      // TODO: Clean up from SessionMetadata table when implemented
      console.log(`Cleaning up session metadata for session ${sessionId}`);
    } catch (error) {
      console.error('Failed to cleanup session metadata:', error);
    }
  }
}