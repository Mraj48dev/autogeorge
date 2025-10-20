# AutoGeorge

An automated content generation and publishing platform built with **Clean Architecture** and **Domain-Driven Design** principles.

![AutoGeorge Architecture](docs/architecture/autogeorge-architecture.png)

## 🚀 Overview

AutoGeorge is a modular webapp that automates the entire content creation pipeline - from idea generation to publication. It leverages AI services to create high-quality articles, optimizes them for SEO, and publishes them to various platforms including WordPress sites.

### Key Features

- **🤖 AI-Powered Content Generation** - Uses Perplexity and OpenAI for research-based article creation
- **📝 SEO Optimization** - Automatic meta tags, descriptions, and keyword optimization
- **🖼️ Image Integration** - Fetches from Pixabay or generates with DALL-E
- **📱 Multi-Platform Publishing** - WordPress, draft mode, or manual export
- **🔐 User Management** - Token-based usage with admin controls
- **📊 Comprehensive Logging** - Full audit trail of all operations
- **🏗️ Clean Architecture** - Modular, testable, and maintainable codebase

## 🏛️ Architecture

This project follows **Clean Architecture** (Hexagonal Architecture) with clear separation of concerns:

```
📁 src/
├── 📁 modules/                    # Bounded contexts
│   ├── 📁 auth/                   # Authentication & authorization
│   ├── 📁 sites/                  # Website management
│   ├── 📁 sources/                # Content sources (RSS, Telegram, Calendar)
│   ├── 📁 content/                # Article generation & management
│   ├── 📁 media/                  # Image handling
│   ├── 📁 publishing/             # Content distribution
│   ├── 📁 billing/                # Token management
│   └── 📁 logs/                   # Audit & system logs
├── 📁 shared/                     # Cross-cutting concerns
│   ├── 📁 domain/                 # Base classes, types, errors
│   ├── 📁 application/            # Use case base classes
│   ├── 📁 infrastructure/         # Database, external APIs
│   └── 📁 ui/                     # Shared UI components
├── 📁 composition-root/           # Dependency injection
└── 📁 app/                        # Next.js App Router
```

### Module Structure

Each module follows the same layered structure:

- **`domain/`** - Entities, value objects, domain events, ports (interfaces)
- **`application/`** - Use cases, command/query handlers
- **`infrastructure/`** - Concrete implementations (repositories, services)
- **`admin/`** - Admin facade with CLI and HTTP interfaces

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5
- **UI**: Tailwind CSS + Shadcn/ui components
- **AI Services**: Perplexity AI + OpenAI
- **Testing**: Vitest + Testing Library + Playwright
- **Development**: GitHub Codespaces + Vercel deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Perplexity API key

### GitHub Codespaces (Recommended)

1. **Open in Codespaces** - Click the green "Code" button → "Open with Codespaces"
2. **Wait for setup** - The devcontainer will automatically install dependencies
3. **Copy environment** - `cp .env.example .env.local`
4. **Add your API keys** to `.env.local`
5. **Start developing** - `npm run dev`

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/autogeorge.git
   cd autogeorge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Setup database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` to see the application.

### Docker Development

1. **Start all services**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

2. **Access services**
   - App: http://localhost:3000
   - Database UI: http://localhost:8080
   - Redis UI: http://localhost:8081

## 📝 Environment Configuration

Create `.env.local` from `.env.example` and configure:

### Required Variables
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/autogeorge_dev
PERPLEXITY_API_KEY=pplx-your-key-here
NEXTAUTH_SECRET=your-secret-here
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-encryption-key-here
```

### Optional Variables
```env
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_CLIENT_ID=your-google-oauth-id
GITHUB_CLIENT_ID=your-github-oauth-id
SENTRY_DSN=your-sentry-dsn
```

See `.env.example` for all available configuration options.

## 🎯 Usage Examples

### Generate an Article (CLI)

```bash
# Generate a simple article
npm run admin:generate-article "Write about renewable energy benefits"

# View available admin commands
npm run admin:list-use-cases

# Check system health
npm run admin:health
```

### Generate an Article (API)

```bash
curl -X POST http://localhost:3000/api/admin/content/execute/GenerateArticle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{
    "prompt": "Write a comprehensive guide about sustainable technology",
    "model": "llama-3.1-sonar-large-128k-online",
    "targetWordCount": 1500,
    "tone": "professional",
    "style": "guide",
    "keywords": ["sustainability", "green technology", "renewable energy"]
  }'
```

### Admin Interface

Every module exposes a unified admin interface supporting:

- **Validation** - JSON Schema validation of inputs
- **Dry-run mode** - Test operations safely
- **Idempotency** - Safe operation retries
- **Logging** - Full audit trail
- **Health checks** - Monitor system status

Example admin operations:

```typescript
// List available use cases
const useCases = await contentAdmin.listUseCases();

// Validate input
const validation = await contentAdmin.validate('GenerateArticle', input);

// Execute with dry-run
const result = await contentAdmin.execute('GenerateArticle', input, {
  dryRun: true
});

// Check module health
const health = await contentAdmin.getModuleHealth();
```

## 🧪 Testing

### Run Tests

```bash
# Unit and integration tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Test Structure

```
📁 src/tests/
├── 📁 unit/           # Domain and application logic tests
├── 📁 integration/    # Repository and service tests
├── 📁 contract/       # API contract tests
├── 📁 e2e/           # End-to-end tests
└── 📁 fixtures/      # Test data and mocks
```

### Writing Tests

```typescript
// Domain entity test
describe('Article Entity', () => {
  test('should create valid article', () => {
    const article = Article.createDraft(title, content);
    expect(article.status.isDraft()).toBe(true);
  });
});

// Use case test
describe('GenerateArticle Use Case', () => {
  test('should generate article successfully', async () => {
    const result = await generateArticle.execute(input);
    expect(result.isSuccess()).toBe(true);
  });
});
```

## 🏗️ Development Guidelines

### Architecture Principles

- **🔵 Domain First** - Rich domain models with business logic
- **🔌 Ports & Adapters** - Abstract interfaces, concrete implementations
- **📦 Modular Design** - Bounded contexts with clear APIs
- **🚫 No Framework Lock-in** - Business logic independent of frameworks
- **✅ Error as Data** - Result types instead of exceptions
- **🎯 Single Responsibility** - Each component has one clear purpose

### Code Style Rules

- **🚀 TypeScript Strict Mode** - Full type safety
- **📝 Comprehensive Comments** - Explain business rules and architectural decisions
- **🎯 Explicit Naming** - Self-documenting code
- **🧪 Test-Driven** - Tests for all business logic
- **🔒 Immutable by Default** - Value objects and entities
- **📊 Observable** - Logging and metrics for all operations

### Do's and Don'ts

#### ✅ Do's
- Use Result types for error handling
- Implement comprehensive logging
- Follow the established module structure
- Write tests for domain logic
- Use value objects for validation
- Document architectural decisions
- Implement admin interfaces for all modules

#### ❌ Don'ts
- Don't put business logic in the composition root
- Don't couple modules through concrete types (use ports)
- Don't use "magic" reflection that reduces testability
- Don't create different environments between dev and production
- Don't commit secrets to the repository
- Don't skip input validation

## 📦 Deployment

### Vercel (Recommended)

1. **Connect Repository** - Import project in Vercel dashboard
2. **Set Environment Variables** - Add production config
3. **Deploy** - Automatic deployment on push to main

### Docker Production

```bash
# Build production image
docker build -t autogeorge:latest .

# Run with environment file
docker run -p 3000:3000 --env-file .env.production autogeorge:latest
```

### Manual Deployment

```bash
# Build application
npm run build:prod

# Start production server
npm start
```

## 🔧 Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm test` | Run all tests |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run admin:health` | Check system health |

## 📚 Documentation

- [Architecture Decision Records](docs/architecture/adr/)
- [API Documentation](docs/api/)
- [Deployment Guide](docs/deployment/)
- [Development Setup](docs/development/)
- [Module Documentation](docs/modules/)

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch** - `git checkout -b feature/amazing-feature`
3. **Follow coding standards** - Run linting and tests
4. **Commit changes** - Use conventional commit format
5. **Push to branch** - `git push origin feature/amazing-feature`
6. **Open Pull Request** - Describe your changes

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Check database is running
npm run docker:up
# Regenerate Prisma client
npm run db:generate
```

**API Key Issues**
```bash
# Verify environment variables
cat .env.local | grep API_KEY
# Test API connectivity
npm run admin:health
```

**Build Failures**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Getting Help

- 📖 Check [Documentation](docs/)
- 🐛 Search [Issues](https://github.com/your-org/autogeorge/issues)
- 💬 Ask in [Discussions](https://github.com/your-org/autogeorge/discussions)
- 📧 Email: team@autogeorge.dev

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Clean Architecture** concepts by Robert C. Martin
- **Domain-Driven Design** principles by Eric Evans
- **Hexagonal Architecture** pattern by Alistair Cockburn
- Next.js and Vercel teams for excellent developer experience
- Perplexity AI for research-quality content generation

---

**Built with ❤️ using Clean Architecture principles**

🔗 **Links**: [Homepage](https://autogeorge.dev) • [Documentation](https://docs.autogeorge.dev) • [API Reference](https://api.autogeorge.dev)# Deploy trigger Sab 20 Set 2025 07:40:29 CEST
# Force rebuild Lun 20 Ott 2025 09:36:26 CEST
