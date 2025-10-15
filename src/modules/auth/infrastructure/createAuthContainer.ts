import { prisma } from '../../../shared/database/prisma';
import { AuthContainer } from './AuthContainer';

/**
 * Creates and returns an Auth container instance
 */
export function createAuthContainer(): AuthContainer {
  return new AuthContainer(prisma);
}