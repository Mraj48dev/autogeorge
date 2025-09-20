# AutoGeorge - Project Structure

```
autogeorge/
├── .devcontainer/
│   ├── devcontainer.json
│   └── docker-compose.yml
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .vscode/
│   ├── settings.json
│   └── extensions.json
├── docs/
│   ├── architecture/
│   │   ├── adr/
│   │   │   ├── 001-modular-monolith.md
│   │   │   ├── 002-clean-architecture.md
│   │   │   └── 003-error-handling.md
│   │   └── api/
│   │       ├── openapi.yml
│   │       └── asyncapi.yml
│   └── deployment/
├── scripts/
│   ├── seed.ts
│   ├── migrate.ts
│   └── generate-schemas.ts
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── auth/
│   │   │   │   ├── sites/
│   │   │   │   ├── sources/
│   │   │   │   ├── content/
│   │   │   │   ├── media/
│   │   │   │   ├── publishing/
│   │   │   │   ├── billing/
│   │   │   │   └── logs/
│   │   │   ├── health/
│   │   │   └── webhooks/
│   │   ├── dashboard/
│   │   ├── admin/
│   │   ├── login/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── User.ts
│   │   │   │   │   └── Session.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── UserId.ts
│   │   │   │   │   ├── Email.ts
│   │   │   │   │   └── Role.ts
│   │   │   │   ├── events/
│   │   │   │   │   └── UserRegistered.ts
│   │   │   │   └── ports/
│   │   │   │       ├── UserRepository.ts
│   │   │   │       └── AuthService.ts
│   │   │   ├── application/
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── RegisterUser.ts
│   │   │   │   │   ├── LoginUser.ts
│   │   │   │   │   └── RefreshToken.ts
│   │   │   │   └── handlers/
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/
│   │   │   │   │   └── PrismaUserRepository.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── NextAuthService.ts
│   │   │   │   └── adapters/
│   │   │   └── admin/
│   │   │       ├── AuthAdminFacade.ts
│   │   │       ├── cli/
│   │   │       └── http/
│   │   ├── sites/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── Site.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── SiteId.ts
│   │   │   │   │   ├── SiteName.ts
│   │   │   │   │   ├── Url.ts
│   │   │   │   │   └── WordPressCredentials.ts
│   │   │   │   ├── events/
│   │   │   │   │   └── SiteRegistered.ts
│   │   │   │   └── ports/
│   │   │   │       ├── SiteRepository.ts
│   │   │   │       └── WordPressService.ts
│   │   │   ├── application/
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── RegisterSite.ts
│   │   │   │   │   ├── UpdateSite.ts
│   │   │   │   │   └── ValidateWordPressConnection.ts
│   │   │   │   └── handlers/
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/
│   │   │   │   │   └── PrismaSiteRepository.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── WordPressApiService.ts
│   │   │   │   └── adapters/
│   │   │   └── admin/
│   │   │       ├── SitesAdminFacade.ts
│   │   │       ├── cli/
│   │   │       └── http/
│   │   ├── sources/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── Source.ts
│   │   │   │   │   ├── RssFeed.ts
│   │   │   │   │   ├── TelegramChannel.ts
│   │   │   │   │   └── EditorialCalendar.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── SourceId.ts
│   │   │   │   │   ├── SourceType.ts
│   │   │   │   │   └── FeedUrl.ts
│   │   │   │   ├── events/
│   │   │   │   │   ├── SourceAdded.ts
│   │   │   │   │   └── ContentDetected.ts
│   │   │   │   └── ports/
│   │   │   │       ├── SourceRepository.ts
│   │   │   │       ├── RssService.ts
│   │   │   │       └── TelegramService.ts
│   │   │   ├── application/
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── AddSource.ts
│   │   │   │   │   ├── MonitorSources.ts
│   │   │   │   │   └── ValidateSource.ts
│   │   │   │   └── handlers/
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/
│   │   │   │   │   └── PrismaSourceRepository.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── RssParserService.ts
│   │   │   │   │   └── TelegramBotService.ts
│   │   │   │   └── adapters/
│   │   │   └── admin/
│   │   │       ├── SourcesAdminFacade.ts
│   │   │       ├── cli/
│   │   │       └── http/
│   │   ├── content/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── Article.ts
│   │   │   │   │   ├── ContentGeneration.ts
│   │   │   │   │   └── SeoMetadata.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── ArticleId.ts
│   │   │   │   │   ├── Title.ts
│   │   │   │   │   ├── Content.ts
│   │   │   │   │   ├── Prompt.ts
│   │   │   │   │   └── GenerationStatus.ts
│   │   │   │   ├── events/
│   │   │   │   │   ├── ArticleGenerated.ts
│   │   │   │   │   └── GenerationFailed.ts
│   │   │   │   └── ports/
│   │   │   │       ├── ArticleRepository.ts
│   │   │   │       ├── AiService.ts
│   │   │   │       └── SeoService.ts
│   │   │   ├── application/
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── GenerateArticle.ts
│   │   │   │   │   ├── EnhanceWithSeo.ts
│   │   │   │   │   └── ValidateContent.ts
│   │   │   │   └── handlers/
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/
│   │   │   │   │   └── PrismaArticleRepository.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── PerplexityService.ts
│   │   │   │   │   └── OpenAiService.ts
│   │   │   │   └── adapters/
│   │   │   └── admin/
│   │   │       ├── ContentAdminFacade.ts
│   │   │       ├── cli/
│   │   │       └── http/
│   │   ├── media/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── Media.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── MediaId.ts
│   │   │   │   │   ├── MediaType.ts
│   │   │   │   │   ├── ImageUrl.ts
│   │   │   │   │   └── ImagePrompt.ts
│   │   │   │   ├── events/
│   │   │   │   │   └── MediaGenerated.ts
│   │   │   │   └── ports/
│   │   │   │       ├── MediaRepository.ts
│   │   │   │       ├── ImageSearchService.ts
│   │   │   │       └── ImageGenerationService.ts
│   │   │   ├── application/
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── SearchImage.ts
│   │   │   │   │   ├── GenerateImage.ts
│   │   │   │   │   └── OptimizeImage.ts
│   │   │   │   └── handlers/
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/
│   │   │   │   │   └── PrismaMediaRepository.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── PixabayService.ts
│   │   │   │   │   └── DalleService.ts
│   │   │   │   └── adapters/
│   │   │   └── admin/
│   │   │       ├── MediaAdminFacade.ts
│   │   │       ├── cli/
│   │   │       └── http/
│   │   ├── publishing/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── Publication.ts
│   │   │   │   │   └── PublishingJob.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── PublicationId.ts
│   │   │   │   │   ├── PublishingStatus.ts
│   │   │   │   │   └── PublishingMode.ts
│   │   │   │   ├── events/
│   │   │   │   │   ├── ArticlePublished.ts
│   │   │   │   │   └── PublishingFailed.ts
│   │   │   │   └── ports/
│   │   │   │       ├── PublicationRepository.ts
│   │   │   │       └── PublishingService.ts
│   │   │   ├── application/
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── PublishArticle.ts
│   │   │   │   │   ├── SchedulePublication.ts
│   │   │   │   │   └── SaveAsDraft.ts
│   │   │   │   └── handlers/
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/
│   │   │   │   │   └── PrismaPublicationRepository.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── WordPressPublishingService.ts
│   │   │   │   └── adapters/
│   │   │   └── admin/
│   │   │       ├── PublishingAdminFacade.ts
│   │   │       ├── cli/
│   │   │       └── http/
│   │   ├── billing/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── TokenBalance.ts
│   │   │   │   │   ├── Transaction.ts
│   │   │   │   │   └── Purchase.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── TokenAmount.ts
│   │   │   │   │   ├── Price.ts
│   │   │   │   │   └── TransactionId.ts
│   │   │   │   ├── events/
│   │   │   │   │   ├── TokensPurchased.ts
│   │   │   │   │   ├── TokensConsumed.ts
│   │   │   │   │   └── TokensGranted.ts
│   │   │   │   └── ports/
│   │   │   │       ├── BillingRepository.ts
│   │   │   │       └── PaymentService.ts
│   │   │   ├── application/
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── PurchaseTokens.ts
│   │   │   │   │   ├── ConsumeTokens.ts
│   │   │   │   │   ├── GrantTokens.ts
│   │   │   │   │   └── GetBalance.ts
│   │   │   │   └── handlers/
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/
│   │   │   │   │   └── PrismaBillingRepository.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── StripePaymentService.ts
│   │   │   │   └── adapters/
│   │   │   └── admin/
│   │   │       ├── BillingAdminFacade.ts
│   │   │       ├── cli/
│   │   │       └── http/
│   │   ├── logs/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── AuditLog.ts
│   │   │   │   │   └── SystemLog.ts
│   │   │   │   ├── value-objects/
│   │   │   │   │   ├── LogId.ts
│   │   │   │   │   ├── LogLevel.ts
│   │   │   │   │   ├── LogEvent.ts
│   │   │   │   │   └── Timestamp.ts
│   │   │   │   ├── events/
│   │   │   │   │   └── LogCreated.ts
│   │   │   │   └── ports/
│   │   │   │       ├── LogRepository.ts
│   │   │   │       └── LogService.ts
│   │   │   ├── application/
│   │   │   │   ├── use-cases/
│   │   │   │   │   ├── CreateLog.ts
│   │   │   │   │   ├── QueryLogs.ts
│   │   │   │   │   └── ExportLogs.ts
│   │   │   │   └── handlers/
│   │   │   ├── infrastructure/
│   │   │   │   ├── repositories/
│   │   │   │   │   └── PrismaLogRepository.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── WinstonLogService.ts
│   │   │   │   └── adapters/
│   │   │   └── admin/
│   │   │       ├── LogsAdminFacade.ts
│   │   │       ├── cli/
│   │   │       └── http/
│   │   └── admin/
│   │       ├── domain/
│   │       │   ├── entities/
│   │       │   │   └── AdminUser.ts
│   │       │   ├── value-objects/
│   │       │   │   ├── AdminRole.ts
│   │       │   │   └── Permission.ts
│   │       │   ├── events/
│   │       │   │   └── AdminActionPerformed.ts
│   │       │   └── ports/
│   │       │       └── AdminRepository.ts
│   │       ├── application/
│   │       │   ├── use-cases/
│   │       │   │   ├── GrantPermission.ts
│   │       │   │   ├── ExecuteAdminAction.ts
│   │       │   │   └── ViewSystemHealth.ts
│   │       │   └── handlers/
│   │       ├── infrastructure/
│   │       │   ├── repositories/
│   │       │   │   └── PrismaAdminRepository.ts
│   │       │   ├── services/
│   │       │   └── adapters/
│   │       └── admin/
│   │           ├── AdminAdminFacade.ts
│   │           ├── cli/
│   │           └── http/
│   ├── shared/
│   │   ├── domain/
│   │   │   ├── base/
│   │   │   │   ├── Entity.ts
│   │   │   │   ├── ValueObject.ts
│   │   │   │   ├── DomainEvent.ts
│   │   │   │   └── AggregateRoot.ts
│   │   │   ├── types/
│   │   │   │   ├── Result.ts
│   │   │   │   ├── Option.ts
│   │   │   │   └── Either.ts
│   │   │   └── errors/
│   │   │       ├── DomainError.ts
│   │   │       ├── ValidationError.ts
│   │   │       └── BusinessRuleError.ts
│   │   ├── application/
│   │   │   ├── base/
│   │   │   │   ├── UseCase.ts
│   │   │   │   ├── CommandHandler.ts
│   │   │   │   ├── QueryHandler.ts
│   │   │   │   └── EventHandler.ts
│   │   │   ├── middleware/
│   │   │   │   ├── AuthenticationMiddleware.ts
│   │   │   │   ├── AuthorizationMiddleware.ts
│   │   │   │   ├── RateLimitMiddleware.ts
│   │   │   │   └── IdempotencyMiddleware.ts
│   │   │   └── services/
│   │   │       ├── EventBus.ts
│   │   │       ├── CommandBus.ts
│   │   │       └── QueryBus.ts
│   │   ├── infrastructure/
│   │   │   ├── database/
│   │   │   │   ├── PrismaClient.ts
│   │   │   │   ├── migrations/
│   │   │   │   └── seeds/
│   │   │   ├── queue/
│   │   │   │   ├── BullMQAdapter.ts
│   │   │   │   └── JobProcessor.ts
│   │   │   ├── external-apis/
│   │   │   │   ├── HttpClient.ts
│   │   │   │   └── ApiError.ts
│   │   │   ├── cache/
│   │   │   │   └── RedisAdapter.ts
│   │   │   └── monitoring/
│   │   │       ├── Logger.ts
│   │   │       ├── Metrics.ts
│   │   │       └── Tracer.ts
│   │   ├── ui/
│   │   │   ├── components/
│   │   │   │   ├── base/
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   └── Table.tsx
│   │   │   │   ├── forms/
│   │   │   │   │   ├── FormField.tsx
│   │   │   │   │   └── FormValidation.tsx
│   │   │   │   └── layout/
│   │   │   │       ├── Header.tsx
│   │   │   │       ├── Sidebar.tsx
│   │   │   │       └── Footer.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useApi.ts
│   │   │   │   └── useLocalStorage.ts
│   │   │   └── utils/
│   │   │       ├── formatting.ts
│   │   │       ├── validation.ts
│   │   │       └── api.ts
│   │   └── config/
│   │       ├── env.ts
│   │       ├── database.ts
│   │       ├── auth.ts
│   │       ├── queue.ts
│   │       └── external-apis.ts
│   ├── contracts/
│   │   ├── schemas/
│   │   │   ├── auth/
│   │   │   │   ├── register-user.json
│   │   │   │   ├── login-user.json
│   │   │   │   └── refresh-token.json
│   │   │   ├── sites/
│   │   │   │   ├── register-site.json
│   │   │   │   └── update-site.json
│   │   │   ├── sources/
│   │   │   │   └── add-source.json
│   │   │   ├── content/
│   │   │   │   ├── generate-article.json
│   │   │   │   └── enhance-seo.json
│   │   │   ├── media/
│   │   │   │   ├── search-image.json
│   │   │   │   └── generate-image.json
│   │   │   ├── publishing/
│   │   │   │   ├── publish-article.json
│   │   │   │   └── schedule-publication.json
│   │   │   ├── billing/
│   │   │   │   ├── purchase-tokens.json
│   │   │   │   └── grant-tokens.json
│   │   │   └── logs/
│   │   │       ├── create-log.json
│   │   │       └── query-logs.json
│   │   ├── api/
│   │   │   ├── openapi.yml
│   │   │   └── asyncapi.yml
│   │   └── types/
│   │       ├── index.ts
│   │       └── generated/
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   └── shared/
│   │   ├── integration/
│   │   │   ├── repositories/
│   │   │   ├── services/
│   │   │   └── admin/
│   │   ├── contract/
│   │   │   ├── auth/
│   │   │   ├── sites/
│   │   │   └── content/
│   │   ├── e2e/
│   │   │   ├── user-flows/
│   │   │   └── admin-flows/
│   │   ├── fixtures/
│   │   │   ├── users.ts
│   │   │   ├── sites.ts
│   │   │   └── articles.ts
│   │   ├── helpers/
│   │   │   ├── test-database.ts
│   │   │   ├── mock-services.ts
│   │   │   └── test-utils.ts
│   │   └── setup.ts
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── auth.ts
│   │   │   ├── sites.ts
│   │   │   ├── sources.ts
│   │   │   ├── content.ts
│   │   │   ├── media.ts
│   │   │   ├── publishing.ts
│   │   │   ├── billing.ts
│   │   │   ├── logs.ts
│   │   │   └── admin.ts
│   │   ├── main.ts
│   │   └── utils/
│   ├── observability/
│   │   ├── logger/
│   │   │   ├── Logger.ts
│   │   │   ├── LoggerConfig.ts
│   │   │   └── LoggerMiddleware.ts
│   │   ├── metrics/
│   │   │   ├── MetricsCollector.ts
│   │   │   ├── CustomMetrics.ts
│   │   │   └── MetricsMiddleware.ts
│   │   ├── tracing/
│   │   │   ├── Tracer.ts
│   │   │   ├── TracingConfig.ts
│   │   │   └── TracingMiddleware.ts
│   │   └── health/
│   │       ├── HealthCheck.ts
│   │       └── ReadinessCheck.ts
│   └── composition-root/
│       ├── container.ts
│       ├── modules/
│       │   ├── auth.ts
│       │   ├── sites.ts
│       │   ├── sources.ts
│       │   ├── content.ts
│       │   ├── media.ts
│       │   ├── publishing.ts
│       │   ├── billing.ts
│       │   ├── logs.ts
│       │   └── admin.ts
│       └── main.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seeds/
├── public/
│   ├── images/
│   └── icons/
├── examples/
│   ├── requests/
│   │   ├── auth/
│   │   ├── sites/
│   │   ├── sources/
│   │   ├── content/
│   │   ├── media/
│   │   ├── publishing/
│   │   ├── billing/
│   │   └── logs/
│   └── responses/
├── .env.example
├── .env.local
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── vitest.config.ts
├── package.json
├── README.md
└── CLAUDE.md
```