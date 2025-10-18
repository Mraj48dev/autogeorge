import { Result } from '@/shared/utils/Result';
import { Site } from '../../domain/entities/Site';
import { WordPressConnectionService, WordPressConnectionTest } from '../../domain/ports/WordPressConnectionService';
import { Logger } from '@/shared/infrastructure/monitoring/Logger';

export class WordPressConnectionTestService implements WordPressConnectionService {
  constructor(private logger: Logger) {}

  async testConnection(site: Site): Promise<Result<WordPressConnectionTest, Error>> {
    this.logger.info('WordPressConnectionTestService: Testing connection', {
      siteId: site.id,
      url: site.url
    });

    try {
      const startTime = Date.now();

      // Test basic reachability
      const reachabilityResult = await this.testReachability(site);
      if (reachabilityResult.isFailure()) {
        return Result.failure(reachabilityResult.error);
      }

      const responseTime = Date.now() - startTime;

      // Test REST API endpoint
      const apiResult = await this.testWordPressAPI(site);
      if (apiResult.isFailure()) {
        return Result.success({
          isReachable: true,
          isValid: false,
          responseTime,
          warnings: [`WordPress API test failed: ${apiResult.error.message}`]
        });
      }

      // Test credentials
      const credentialsResult = await this.verifyCredentials(site);
      const credentialsValid = credentialsResult.isSuccess() && credentialsResult.data;

      const result: WordPressConnectionTest = {
        isReachable: true,
        isValid: credentialsValid,
        responseTime,
        version: apiResult.data.version,
        warnings: credentialsValid ? [] : ['Invalid credentials or insufficient permissions']
      };

      return Result.success(result);

    } catch (error) {
      this.logger.error('WordPressConnectionTestService: Connection test failed', {
        siteId: site.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return Result.success({
        isReachable: false,
        isValid: false,
        responseTime: 0,
        warnings: ['Connection test failed: ' + (error instanceof Error ? error.message : 'Unknown error')]
      });
    }
  }

  async verifyCredentials(site: Site): Promise<Result<boolean, Error>> {
    try {
      const url = `${site.url.replace(/\/$/, '')}/wp-json/wp/v2/users/me`;
      const auth = Buffer.from(`${site.username}:${site.password}`).toString('base64');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.ok) {
        const userData = await response.json();
        this.logger.info('WordPressConnectionTestService: Credentials verified', {
          siteId: site.id,
          userId: userData.id
        });
        return Result.success(true);
      } else {
        this.logger.warn('WordPressConnectionTestService: Invalid credentials', {
          siteId: site.id,
          status: response.status
        });
        return Result.success(false);
      }

    } catch (error) {
      this.logger.error('WordPressConnectionTestService: Credentials verification failed', {
        siteId: site.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return Result.failure(new Error('Failed to verify credentials'));
    }
  }

  async getSiteInfo(site: Site): Promise<Result<any, Error>> {
    try {
      const url = `${site.url.replace(/\/$/, '')}/wp-json`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (!response.ok) {
        return Result.failure(new Error(`Site info request failed: ${response.status}`));
      }

      const siteInfo = await response.json();
      return Result.success(siteInfo);

    } catch (error) {
      this.logger.error('WordPressConnectionTestService: Failed to get site info', {
        siteId: site.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return Result.failure(new Error('Failed to get site information'));
    }
  }

  private async testReachability(site: Site): Promise<Result<void, Error>> {
    try {
      const url = site.url;
      const response = await fetch(url, {
        method: 'HEAD',
        timeout: 10000
      });

      if (response.ok || response.status < 500) {
        return Result.success(undefined);
      } else {
        return Result.failure(new Error(`Site not reachable: HTTP ${response.status}`));
      }

    } catch (error) {
      return Result.failure(new Error(`Site not reachable: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  private async testWordPressAPI(site: Site): Promise<Result<{ version?: string }, Error>> {
    try {
      const url = `${site.url.replace(/\/$/, '')}/wp-json`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (!response.ok) {
        return Result.failure(new Error(`WordPress API not available: HTTP ${response.status}`));
      }

      const apiInfo = await response.json();

      // Check if it's a WordPress site
      if (!apiInfo.name || !apiInfo.name.includes('WordPress')) {
        return Result.failure(new Error('Site does not appear to be WordPress'));
      }

      return Result.success({
        version: apiInfo.description || 'Unknown'
      });

    } catch (error) {
      return Result.failure(new Error(`WordPress API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
}