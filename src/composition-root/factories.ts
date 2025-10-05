import { Container } from './container';
import { Config } from '../shared/config/env';

/**
 * Factory functions for creating properly configured container instances
 */

let globalContainer: Container | null = null;

/**
 * Creates a container instance with environment configuration
 */
export function createContainer(): Container {
  if (!globalContainer) {
    const config = Config.fromEnvironment();
    globalContainer = Container.getInstance(config);
  }
  return globalContainer;
}

/**
 * Creates a container for testing with mock configuration
 */
export function createTestContainer(testConfig?: Partial<Config>): Container {
  const config = testConfig ?
    { ...Config.fromEnvironment(), ...testConfig } :
    Config.forTesting();

  Container.reset();
  return Container.getInstance(config);
}

/**
 * Resets the global container (useful for testing)
 */
export function resetContainer(): void {
  globalContainer = null;
  Container.reset();
}