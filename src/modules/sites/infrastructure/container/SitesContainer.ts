import { Logger } from '@/shared/infrastructure/monitoring/Logger';
import { SiteRepository } from '../../domain/ports/SiteRepository';
import { WordPressConnectionService } from '../../domain/ports/WordPressConnectionService';
import { PrismaSiteRepository } from '../repositories/PrismaSiteRepository';
import { WordPressConnectionTestService } from '../services/WordPressConnectionTestService';
import { CreateSite } from '../../application/use-cases/CreateSite';
import { GetUserSites } from '../../application/use-cases/GetUserSites';
import { UpdateSite } from '../../application/use-cases/UpdateSite';
import { DeleteSite } from '../../application/use-cases/DeleteSite';
import { SitesAdminFacade } from '../../admin/SitesAdminFacade';

/**
 * Sites Module Container
 *
 * Provides dependency injection container for the sites module following
 * Clean/Hexagonal Architecture patterns.
 *
 * Features:
 * - Lazy loading of dependencies
 * - Singleton pattern for shared services
 * - Easy testing with mock implementations
 */
export class SitesContainer {
  private static instance: SitesContainer | null = null;

  // Infrastructure dependencies (lazy loaded)
  private _logger: Logger | null = null;
  private _siteRepository: SiteRepository | null = null;
  private _wordpressConnectionService: WordPressConnectionService | null = null;

  // Application services (lazy loaded)
  private _createSite: CreateSite | null = null;
  private _getUserSites: GetUserSites | null = null;
  private _updateSite: UpdateSite | null = null;
  private _deleteSite: DeleteSite | null = null;

  // Admin facade (lazy loaded)
  private _sitesAdminFacade: SitesAdminFacade | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): SitesContainer {
    if (!SitesContainer.instance) {
      SitesContainer.instance = new SitesContainer();
    }
    return SitesContainer.instance;
  }

  /**
   * Reset singleton (useful for testing)
   */
  static reset(): void {
    SitesContainer.instance = null;
  }

  // === Infrastructure Layer ===

  get logger(): Logger {
    if (!this._logger) {
      this._logger = new Logger('SitesModule');
    }
    return this._logger;
  }

  get siteRepository(): SiteRepository {
    if (!this._siteRepository) {
      this._siteRepository = new PrismaSiteRepository(this.logger);
    }
    return this._siteRepository;
  }

  get wordpressConnectionService(): WordPressConnectionService {
    if (!this._wordpressConnectionService) {
      this._wordpressConnectionService = new WordPressConnectionTestService(this.logger);
    }
    return this._wordpressConnectionService;
  }

  // === Application Layer ===

  get createSite(): CreateSite {
    if (!this._createSite) {
      this._createSite = new CreateSite(
        this.siteRepository,
        this.wordpressConnectionService,
        this.logger
      );
    }
    return this._createSite;
  }

  get getUserSites(): GetUserSites {
    if (!this._getUserSites) {
      this._getUserSites = new GetUserSites(
        this.siteRepository,
        this.logger
      );
    }
    return this._getUserSites;
  }

  get updateSite(): UpdateSite {
    if (!this._updateSite) {
      this._updateSite = new UpdateSite(
        this.siteRepository,
        this.wordpressConnectionService,
        this.logger
      );
    }
    return this._updateSite;
  }

  get deleteSite(): DeleteSite {
    if (!this._deleteSite) {
      this._deleteSite = new DeleteSite(
        this.siteRepository,
        this.logger
      );
    }
    return this._deleteSite;
  }

  // === Admin Layer ===

  get sitesAdminFacade(): SitesAdminFacade {
    if (!this._sitesAdminFacade) {
      this._sitesAdminFacade = new SitesAdminFacade(
        this.createSite,
        this.getUserSites,
        this.updateSite,
        this.deleteSite,
        this.logger
      );
    }
    return this._sitesAdminFacade;
  }

  // === Testing Support ===

  /**
   * Dependency injection for testing
   */
  injectDependencies(dependencies: {
    logger?: Logger;
    siteRepository?: SiteRepository;
    wordpressConnectionService?: WordPressConnectionService;
  }): void {
    if (dependencies.logger) this._logger = dependencies.logger;
    if (dependencies.siteRepository) this._siteRepository = dependencies.siteRepository;
    if (dependencies.wordpressConnectionService) this._wordpressConnectionService = dependencies.wordpressConnectionService;

    // Reset dependent services
    this._createSite = null;
    this._getUserSites = null;
    this._updateSite = null;
    this._deleteSite = null;
    this._sitesAdminFacade = null;
  }
}

/**
 * Convenience function to get the sites container
 */
export function createSitesContainer(): SitesContainer {
  return SitesContainer.getInstance();
}