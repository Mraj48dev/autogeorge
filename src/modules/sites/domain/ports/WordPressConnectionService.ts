import { Result } from '@/shared/utils/Result';
import { Site } from '../entities/Site';

export interface WordPressConnectionTest {
  isReachable: boolean;
  isValid: boolean;
  responseTime: number;
  version?: string;
  plugins?: string[];
  themes?: string[];
  warnings: string[];
}

export interface WordPressConnectionService {
  /**
   * Test connection to WordPress site
   */
  testConnection(site: Site): Promise<Result<WordPressConnectionTest, Error>>;

  /**
   * Verify credentials
   */
  verifyCredentials(site: Site): Promise<Result<boolean, Error>>;

  /**
   * Get site information
   */
  getSiteInfo(site: Site): Promise<Result<any, Error>>;
}