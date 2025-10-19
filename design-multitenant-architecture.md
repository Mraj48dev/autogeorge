# 🏗️ MULTI-TENANT ARCHITECTURE DESIGN

## 📊 COMPREHENSIVE AUDIT FINDINGS SUMMARY

### 🚨 CRITICAL ISSUES DISCOVERED

**Database**: 4 core tables missing `userId` (sources, publications, featured_images, image_prompts)
**APIs**: 15+ endpoints with horizontal privilege escalation vulnerabilities
**Frontend**: Dual interface facade - multi-tenant UI calling single-tenant APIs
**Security**: Complete lack of user-scoped data access controls

---

## 🎯 NEW MULTI-TENANT ARCHITECTURE

### 🔐 AUTHENTICATION & AUTHORIZATION LAYER

```typescript
// src/lib/auth.ts
interface AuthContext {
  userId: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

export async function getCurrentUser(request: NextRequest): Promise<AuthContext | null>
export async function requireAuth(request: NextRequest): Promise<AuthContext>
export async function verifyResourceOwnership(userId: string, resourceType: string, resourceId: string): Promise<boolean>
```

### 🗄️ DATABASE SCHEMA REDESIGN

#### Core Relationships
```
User (1)
├── WordPressSites (N) ✅ Already exists
├── Sources (N) ❌ Add userId FK
│   ├── FeedItems (N) ✅ Inherits via sourceId
│   └── Articles (N) ✅ Inherits via sourceId
│       ├── Publications (N) ❌ Add userId FK
│       ├── FeaturedImages (N) ❌ Add userId FK
│       └── ImagePrompts (N) ❌ Add userId FK
└── GenerationSettings (1) ✅ Already exists
```

#### Required Schema Changes
```sql
-- Add userId to core tables
ALTER TABLE sources ADD COLUMN userId TEXT NOT NULL;
ALTER TABLE publications ADD COLUMN userId TEXT NOT NULL;
ALTER TABLE featured_images ADD COLUMN userId TEXT NOT NULL;
ALTER TABLE image_prompts ADD COLUMN userId TEXT NOT NULL;

-- Add foreign key constraints
ALTER TABLE sources ADD CONSTRAINT fk_sources_user
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

-- Add performance indexes
CREATE INDEX idx_sources_user_id ON sources(userId);
CREATE INDEX idx_publications_user_id ON publications(userId);
CREATE INDEX idx_featured_images_user_id ON featured_images(userId);
CREATE INDEX idx_image_prompts_user_id ON image_prompts(userId);
```

#### Prisma Schema Updates
```prisma
model Source {
  id              String     @id @default(cuid())
  userId          String     // NEW FIELD
  name            String
  type            String
  // ... existing fields

  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  articles        Article[]
  feedItems       FeedItem[]

  @@index([userId])
  @@index([userId, type])
  @@unique([userId, type, url]) // User-scoped uniqueness
}

model Publication {
  id          String    @id @default(cuid())
  userId      String    // NEW FIELD
  articleId   String
  // ... existing fields

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// Similar updates for FeaturedImage and ImagePrompt models
```

---

## 🔧 API ARCHITECTURE REDESIGN

### 🆕 NEW URL STRUCTURE

```
OLD PATTERN (Single-Tenant):
/api/admin/sources          → Global sources (INSECURE)
/api/admin/articles         → Global articles (INSECURE)

NEW PATTERN (Multi-Tenant):
/api/user/profile           → User profile
/api/user/sites             → User's sites list
/api/sites/[siteId]/sources → Site's sources
/api/sites/[siteId]/articles → Site's articles
/api/sites/[siteId]/generate → Site's generation
```

### 🔒 AUTHENTICATION MIDDLEWARE

```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const protectedPaths = ['/api/user/', '/api/sites/', '/admin/'];

  if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return withAuth(request);
  }
}

// src/lib/withAuth.ts
export async function withAuth(request: NextRequest) {
  const userId = await getCurrentUser(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Add userId to request headers for downstream use
  const headers = new Headers(request.headers);
  headers.set('x-user-id', userId);

  return NextResponse.next({ headers });
}
```

### 🎯 API ENDPOINT PATTERNS

#### User-Scoped Endpoints
```typescript
// /api/user/sites/route.ts
export async function GET(request: NextRequest) {
  const userId = await requireAuth(request);

  const sites = await prisma.wordPressSite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ sites });
}
```

#### Site-Scoped Endpoints
```typescript
// /api/sites/[siteId]/sources/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const userId = await requireAuth(request);

  // Verify site ownership
  const site = await prisma.wordPressSite.findUnique({
    where: { id: params.siteId, userId }
  });

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  // Get sources - filtered by user
  const sources = await prisma.source.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ sources });
}
```

---

## 🎨 FRONTEND ARCHITECTURE REDESIGN

### 🧩 STATE MANAGEMENT

#### Site Context Provider
```typescript
// src/contexts/SiteContext.tsx
interface SiteContextType {
  currentSite: Site | null;
  userSites: Site[];
  switchSite: (siteId: string) => void;
  loading: boolean;
  error: string | null;
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [userSites, setUserSites] = useState<Site[]>([]);

  // Load user sites on mount
  useEffect(() => {
    loadUserSites();
  }, []);

  // Persist current site selection
  useEffect(() => {
    if (currentSite) {
      localStorage.setItem('currentSiteId', currentSite.id);
    }
  }, [currentSite]);

  const switchSite = (siteId: string) => {
    const site = userSites.find(s => s.id === siteId);
    setCurrentSite(site || null);
    // Navigate to site dashboard
    router.push(`/admin/sites/${siteId}/dashboard`);
  };

  return (
    <SiteContext.Provider value={{
      currentSite,
      userSites,
      switchSite,
      loading,
      error
    }}>
      {children}
    </SiteContext.Provider>
  );
}
```

### 🗺️ NAVIGATION REDESIGN

#### Unified Admin Layout
```typescript
// src/app/admin/layout.tsx
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { currentSite, userSites, switchSite } = useSiteContext();

  // Redirect to site selection if no site selected
  if (!currentSite && userSites.length > 0) {
    return <SiteSelectionPage />;
  }

  return (
    <div className="admin-layout">
      <Header>
        <SiteSelector />
        <UserMenu />
      </Header>

      <Sidebar>
        <SiteNavigation siteId={currentSite?.id} />
      </Sidebar>

      <Main>
        <Breadcrumb />
        {children}
      </Main>
    </div>
  );
}
```

#### Site-Scoped Navigation
```typescript
// src/components/SiteNavigation.tsx
export function SiteNavigation({ siteId }: { siteId: string }) {
  const navItems = [
    { label: 'Dashboard', href: `/admin/sites/${siteId}/dashboard` },
    { label: 'Sources', href: `/admin/sites/${siteId}/sources` },
    { label: 'Articles', href: `/admin/sites/${siteId}/articles` },
    { label: 'Generate', href: `/admin/sites/${siteId}/generate` },
    { label: 'Publishing', href: `/admin/sites/${siteId}/publishing` },
    { label: 'Settings', href: `/admin/sites/${siteId}/settings` },
  ];

  return (
    <nav>
      {navItems.map(item => (
        <NavLink key={item.href} href={item.href}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

### 📱 RESPONSIVE DESIGN

#### Site Selector Component
```typescript
// src/components/SiteSelector.tsx
export function SiteSelector() {
  const { currentSite, userSites, switchSite } = useSiteContext();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="site-selector">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="site-selector-trigger"
      >
        {currentSite ? (
          <>
            <div className="site-info">
              <span className="site-name">{currentSite.name}</span>
              <span className="site-url">{currentSite.url}</span>
            </div>
            <ChevronDown />
          </>
        ) : (
          'Select Site'
        )}
      </button>

      {isOpen && (
        <div className="site-selector-dropdown">
          {userSites.map(site => (
            <button
              key={site.id}
              onClick={() => {
                switchSite(site.id);
                setIsOpen(false);
              }}
              className={`site-option ${currentSite?.id === site.id ? 'active' : ''}`}
            >
              <div className="site-info">
                <span className="site-name">{site.name}</span>
                <span className="site-url">{site.url}</span>
              </div>
            </button>
          ))}

          <hr />

          <Link href="/admin/sites/new" className="add-site-link">
            <Plus size={16} />
            Add New Site
          </Link>
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 BUSINESS LOGIC UPDATES

### 📡 RSS Polling Multi-Tenant

```typescript
// /api/cron/poll-feeds/route.ts
export async function GET() {
  try {
    // Get all active users
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        sources: {
          where: { isActive: true, type: 'rss' }
        }
      }
    });

    const results = [];

    for (const user of users) {
      for (const source of user.sources) {
        try {
          const result = await pollSourceForUser(source, user.id);
          results.push(result);
        } catch (error) {
          console.error(`Polling failed for user ${user.id}, source ${source.id}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      totalPolled: results.length
    });
  } catch (error) {
    return NextResponse.json({ error: 'Polling failed' }, { status: 500 });
  }
}

async function pollSourceForUser(source: Source, userId: string) {
  // Fetch RSS feed
  const feedData = await fetchRssFeed(source.url);

  // Save feed items with userId
  const savedItems = [];
  for (const item of feedData.items) {
    const feedItem = await prisma.feedItem.create({
      data: {
        sourceId: source.id,
        guid: item.guid,
        title: item.title,
        content: item.content,
        url: item.url,
        publishedAt: item.publishedAt,
        // Note: userId is inherited via source relationship
      }
    });
    savedItems.push(feedItem);
  }

  // Auto-generate articles if enabled
  if (source.configuration?.autoGenerate) {
    for (const item of savedItems) {
      await generateArticleForUser(item, userId);
    }
  }

  return {
    sourceId: source.id,
    userId,
    fetchedItems: savedItems.length
  };
}
```

### 🤖 Article Generation Multi-Tenant

```typescript
// /api/sites/[siteId]/generate/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const userId = await requireAuth(request);
  const { feedItemId, customPrompts } = await request.json();

  // Verify site ownership
  const site = await prisma.wordPressSite.findUnique({
    where: { id: params.siteId, userId }
  });

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  // Verify feed item ownership
  const feedItem = await prisma.feedItem.findUnique({
    where: { id: feedItemId },
    include: { source: true }
  });

  if (!feedItem || feedItem.source.userId !== userId) {
    return NextResponse.json({ error: 'Feed item not found' }, { status: 404 });
  }

  // Get user's generation settings
  const settings = await prisma.generationSettings.findUnique({
    where: { userId }
  });

  // Generate article with user context
  const article = await generateArticle({
    feedItem,
    settings,
    customPrompts,
    targetSite: site,
    userId
  });

  return NextResponse.json({ success: true, article });
}
```

---

## 🚀 MIGRATION STRATEGY

### 📋 Phase 1: Foundation (Days 1-3)
1. **Database Migration**
   - Add userId columns to core tables
   - Create foreign key constraints
   - Migrate existing data to first user
   - Add performance indexes

2. **Authentication Middleware**
   - Implement getCurrentUser() function
   - Add authentication to all API routes
   - Create withAuth middleware

### 📋 Phase 2: API Refactor (Days 4-6)
3. **New API Endpoints**
   - Create /api/user/sites endpoint
   - Create /api/sites/[siteId]/* endpoints
   - Add ownership verification to all endpoints

4. **Legacy API Updates**
   - Add userId filtering to existing endpoints
   - Maintain backward compatibility temporarily

### 📋 Phase 3: Frontend Refactor (Days 7-10)
5. **Site Context**
   - Implement SiteProvider context
   - Create SiteSelector component
   - Add site persistence logic

6. **Page Refactor**
   - Remove duplicate /admin/sites/[siteId]/* pages
   - Update /admin/* pages to use site context
   - Update all API calls to new endpoints

### 📋 Phase 4: Polish (Days 11-12)
7. **Business Logic Updates**
   - Update RSS polling for multi-tenant
   - Update article generation for site context
   - Update publishing for site scoping

8. **Security & Testing**
   - Security audit of all endpoints
   - End-to-end testing with multiple users
   - Performance testing with user scoping

---

## 🔍 ROLLBACK PLAN

### Emergency Rollback Strategy
```bash
# 1. Revert to pre-multitenant backup
git checkout pre-multitenant-backup

# 2. Restore database if needed
./scripts/restore-database.sh backup_file.sql

# 3. Deploy previous version
git push --force-with-lease

# 4. Verify functionality
npm run test:e2e
```

### Gradual Rollback (Feature Flags)
```typescript
// Use feature flags for gradual rollout
const isMultiTenantEnabled = process.env.FEATURE_MULTITENANT === 'true';

if (isMultiTenantEnabled) {
  // New multi-tenant logic
} else {
  // Legacy single-tenant logic
}
```

---

## ✅ SUCCESS CRITERIA

### Technical Success
- [ ] Multiple users can create separate accounts
- [ ] Each user sees only their own sites/sources/articles
- [ ] No data leakage between users
- [ ] Performance acceptable with user filtering
- [ ] All endpoints require authentication

### Business Success
- [ ] AutoGeorge is sellable as SaaS
- [ ] Users can manage multiple WordPress sites
- [ ] System scales to 100+ users
- [ ] Clean separation for enterprise customers

### Security Success
- [ ] No horizontal privilege escalation
- [ ] Proper authorization on all endpoints
- [ ] Data isolation verified through testing
- [ ] GDPR compliance for user data

---

*Architecture Design completed: 19 Ottobre 2025*
*Ready for implementation: BIG BANG approach*
*Estimated completion: 12 days*