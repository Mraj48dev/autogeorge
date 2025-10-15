import { AuthenticateUser } from '../../application/use-cases/AuthenticateUser';
import { GetUser } from '../../application/use-cases/GetUser';
import { Email } from '../../domain/value-objects/Email';
import { UserId } from '../../domain/value-objects/UserId';
import { User } from '../../domain/entities/User';

/**
 * NextAuth Adapter Service
 * Bridges NextAuth.js with our Clean Architecture auth module
 */
export class NextAuthAdapter {
  constructor(
    private authenticateUser: AuthenticateUser,
    private getUser: GetUser
  ) {}

  /**
   * Handles user sign-in for NextAuth
   */
  async signIn(user: any, account: any, profile: any): Promise<boolean> {
    try {
      const result = await this.authenticateUser.execute({
        email: user.email,
        userAgent: 'NextAuth',
        ipAddress: 'unknown',
      });

      if (result.isFailure()) {
        console.error('NextAuth sign-in failed:', result.error);
        return false;
      }

      // Update the user object with our domain data
      const domainUser = result.value.user;
      user.id = domainUser.id.getValue();
      user.name = domainUser.name;
      user.role = domainUser.role.getValue();

      return true;
    } catch (error) {
      console.error('NextAuth adapter sign-in error:', error);
      return false;
    }
  }

  /**
   * Handles session creation for NextAuth
   */
  async session(session: any, token: any): Promise<any> {
    try {
      if (token?.sub) {
        const result = await this.getUser.execute({
          userId: token.sub,
        });

        if (result.isSuccess()) {
          const domainUser = result.value.user;

          // Enhance session with domain user data
          session.user = {
            ...session.user,
            id: domainUser.id.getValue(),
            email: domainUser.email.getValue(),
            name: domainUser.name,
            image: domainUser.image,
            role: domainUser.role.getValue(),
            permissions: domainUser.permissions.map(p => p.getValue()),
            isActive: domainUser.isActive,
            emailVerified: domainUser.emailVerified,
            lastLoginAt: domainUser.lastLoginAt,
          };
        }
      }

      return session;
    } catch (error) {
      console.error('NextAuth adapter session error:', error);
      return session;
    }
  }

  /**
   * Handles JWT token creation for NextAuth
   */
  async jwt(token: any, user: any, account: any, profile: any): Promise<any> {
    try {
      // If user object is provided (during sign-in), get fresh user data
      if (user?.email) {
        const result = await this.getUser.execute({
          email: user.email,
        });

        if (result.isSuccess()) {
          const domainUser = result.value.user;

          token.sub = domainUser.id.getValue();
          token.email = domainUser.email.getValue();
          token.name = domainUser.name;
          token.picture = domainUser.image;
          token.role = domainUser.role.getValue();
          token.permissions = domainUser.permissions.map(p => p.getValue());
          token.isActive = domainUser.isActive;
        }
      }

      return token;
    } catch (error) {
      console.error('NextAuth adapter JWT error:', error);
      return token;
    }
  }

  /**
   * Creates a NextAuth adapter object
   */
  createAdapter(): any {
    return {
      signIn: this.signIn.bind(this),
      session: this.session.bind(this),
      jwt: this.jwt.bind(this),
    };
  }

  /**
   * Validates if a user has required permissions
   * Can be used in NextAuth middleware or API routes
   */
  async validateUserPermissions(
    userId: string,
    requiredPermissions: string[],
    requireAll: boolean = true
  ): Promise<{ hasAccess: boolean; user?: User }> {
    try {
      const userResult = await this.getUser.execute({ userId });

      if (userResult.isFailure()) {
        return { hasAccess: false };
      }

      const user = userResult.value.user;

      if (!user.isActive) {
        return { hasAccess: false, user };
      }

      // Check permissions
      const hasAccess = requireAll
        ? requiredPermissions.every(permission =>
            user.hasPermission({ getValue: () => permission } as any)
          )
        : requiredPermissions.some(permission =>
            user.hasPermission({ getValue: () => permission } as any)
          );

      return { hasAccess, user };
    } catch (error) {
      console.error('Permission validation error:', error);
      return { hasAccess: false };
    }
  }

  /**
   * Gets enhanced user data for NextAuth session
   */
  async getEnhancedUser(email: string): Promise<any> {
    try {
      const result = await this.getUser.execute({ email });

      if (result.isFailure()) {
        return null;
      }

      const domainUser = result.value.user;

      return {
        id: domainUser.id.getValue(),
        email: domainUser.email.getValue(),
        name: domainUser.name,
        image: domainUser.image,
        role: domainUser.role.getValue(),
        permissions: domainUser.permissions.map(p => p.getValue()),
        isActive: domainUser.isActive,
        emailVerified: domainUser.emailVerified,
        lastLoginAt: domainUser.lastLoginAt,
      };
    } catch (error) {
      console.error('Get enhanced user error:', error);
      return null;
    }
  }
}