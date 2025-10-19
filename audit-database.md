# 📊 DATABASE SCHEMA AUDIT - SINGLE-TENANT DEPENDENCIES

## 🚨 CRITICAL ISSUES FOUND

### ❌ TABLES MISSING `userId` (REQUIRE MULTI-TENANT CONVERSION)

**1. `sources` (LINE 78-99)**
```prisma
model Source {
  id              String     @id @default(cuid())
  ❌ MISSING: userId          String
  name            String
  type            String
  // ... other fields
}
```
**Impact**: Sources are global, not user-scoped
**Fix Required**: Add `userId` field + foreign key to User

**2. `feed_items` (LINE 161-180)**
```prisma
model FeedItem {
  id          String   @id @default(cuid())
  sourceId    String
  ❌ MISSING: userId (indirect via sourceId)
  // ... other fields
}
```
**Impact**: Feed items not directly user-scoped
**Fix Required**: Add `userId` field OR ensure filtering via source.userId

**3. `publications` (LINE 277-294)**
```prisma
model Publication {
  id          String    @id @default(cuid())
  articleId   String
  ❌ MISSING: userId (indirect via articleId)
  // ... other fields
}
```
**Impact**: Publications not directly user-scoped
**Fix Required**: Add `userId` field OR ensure filtering via article.sourceId.userId

**4. `featured_images` (LINE 296-317)**
```prisma
model FeaturedImage {
  id               String   @id @default(cuid())
  articleId        String
  ❌ MISSING: userId (indirect via articleId)
  // ... other fields
}
```
**Impact**: Featured images not directly user-scoped
**Fix Required**: Add `userId` field OR ensure filtering via article.sourceId.userId

**5. `image_prompts` (LINE 319-337)**
```prisma
model ImagePrompt {
  id               String   @id @default(cuid())
  articleId        String
  ❌ MISSING: userId (indirect via articleId)
  // ... other fields
}
```
**Impact**: Image prompts not directly user-scoped
**Fix Required**: Add `userId` field OR ensure filtering via article chain

---

### ✅ TABLES ALREADY MULTI-TENANT READY

**1. `users` (LINE 101-121)**
```prisma
model User {
  id                  String           @id @default(cuid())
  email               String           @unique
  // ✅ Base user model - already correct
}
```

**2. `wordpress_sites` (LINE 209-234)**
```prisma
model WordPressSite {
  id                   String           @id @default(cuid())
  userId               String           ✅ HAS userId
  name                 String
  // ✅ Already user-scoped
}
```

**3. `generation_settings` (LINE 182-207)**
```prisma
model GenerationSettings {
  id                      String   @id @default(cuid())
  userId                  String   @unique   ✅ HAS userId
  // ✅ Already user-scoped
}
```

**4. `articles` (LINE 10-76)**
```prisma
model Article {
  id               String          @id @default(cuid())
  sourceId         String?         ✅ Connected via Source
  wordpressSiteId  String?         ✅ Connected via WordPressSite (has userId)
  // ✅ User-scoped via relationships (needs verification)
}
```

---

### 🤔 GLOBAL TABLES (DECISION NEEDED)

**1. `health_checks` (LINE 339-355)**
- **Current**: Global system monitoring
- **Decision**: Keep global (system-wide monitoring)

**2. `system_alerts` (LINE 357-380)**
- **Current**: Global system alerts
- **Decision**: Keep global (system-wide alerts)

**3. `health_reports` (LINE 382-406)**
- **Current**: Global health reports
- **Decision**: Keep global (system-wide reports)

---

## 🔗 RELATIONSHIP AUDIT

### DIRECT RELATIONSHIPS TO ADD
```sql
-- sources table
ALTER TABLE sources ADD COLUMN userId TEXT NOT NULL;
ALTER TABLE sources ADD CONSTRAINT fk_sources_user
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

-- Direct user scoping for critical tables
ALTER TABLE publications ADD COLUMN userId TEXT NOT NULL;
ALTER TABLE featured_images ADD COLUMN userId TEXT NOT NULL;
ALTER TABLE image_prompts ADD COLUMN userId TEXT NOT NULL;
```

### INDIRECT RELATIONSHIPS TO VERIFY
```
User → WordPressSite ✅ (exists)
User → Source ❌ (missing - CRITICAL)
Source → FeedItem ✅ (exists)
Source → Article ✅ (exists)
Article → Publication ✅ (exists)
Article → FeaturedImage ✅ (exists)
Article → ImagePrompt ✅ (exists)
```

---

## 📈 HIERARCHY DESIGN

### NEW MULTI-TENANT HIERARCHY
```
User (1)
├── WordPressSites (N) ✅ Already exists
├── Sources (N) ❌ Missing relationship
│   ├── FeedItems (N) ✅ Via sourceId
│   └── Articles (N) ✅ Via sourceId
│       ├── Publications (N) ✅ Via articleId
│       ├── FeaturedImages (N) ✅ Via articleId
│       └── ImagePrompts (N) ✅ Via articleId
└── GenerationSettings (1) ✅ Already exists
```

### URL PATTERN MAPPING
```
OLD: /api/admin/sources
NEW: /api/sites/[siteId]/sources

OLD: /api/admin/articles
NEW: /api/sites/[siteId]/articles

OLD: /admin/sources
NEW: /admin/sites/[siteId]/sources
```

---

## 🚨 MIGRATION COMPLEXITY ASSESSMENT

### HIGH COMPLEXITY (Breaking Changes)
- ❌ `sources` table - Core table, many dependencies
- ❌ API endpoints - All admin endpoints need refactor
- ❌ Frontend routing - Complete navigation restructure

### MEDIUM COMPLEXITY
- ⚠️ `publications` - Add userId, update queries
- ⚠️ `featured_images` - Add userId, update queries
- ⚠️ `image_prompts` - Add userId, update queries

### LOW COMPLEXITY
- ✅ `feed_items` - Inherit from source.userId
- ✅ Global tables - Keep as-is

---

## 📋 NEXT STEPS FOR SCHEMA

1. **Add userId to critical tables** (sources, publications, featured_images, image_prompts)
2. **Create foreign key constraints** to users table
3. **Add indexes** for performance (userId, composite indexes)
4. **Write migration scripts** for existing data
5. **Update Prisma schema** with new relationships
6. **Test data integrity** after migration

---

## 🔍 IDENTIFIED RISKS

### Data Integrity Risks
- Existing data without userId assignment
- Foreign key constraint violations
- Orphaned records after migration

### Performance Risks
- Missing indexes on new userId fields
- Query performance with multi-tenant filtering
- N+1 query problems without proper includes

### Security Risks
- Data leakage between users
- Improper authorization checks
- Missing row-level security

---

*Audit completed: 19 Ottobre 2025*
*Critical tables requiring userId: 4*
*API endpoints requiring refactor: ~15*
*Frontend pages requiring refactor: ~8*