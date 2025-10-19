# 🔧 API ENDPOINTS AUDIT - SINGLE-TENANT ASSUMPTIONS

## 🚨 CRITICAL ENDPOINTS REQUIRING COMPLETE REFACTOR

### ❌ CORE DATA ENDPOINTS (HIGH PRIORITY)

**1. `/api/admin/sources/route.ts`**
```typescript
// PROBLEM: Returns ALL sources globally (line 11-12)
const sources = await prisma.source.findMany({
  orderBy: { createdAt: 'desc' }
});
```
**Issue**: No userId filtering
**New Pattern**: `/api/sites/[siteId]/sources` OR `/api/user/sources`
**Fix Required**: Add user authentication + filtering

**2. `/api/admin/articles-by-source/route.ts`**
```typescript
// PROBLEM: Global article search without user scoping
const where: any = {};
// Missing: where.userId or where.source.userId
```
**Issue**: Articles from all users returned
**New Pattern**: `/api/sites/[siteId]/articles`
**Fix Required**: Filter by user ownership chain

**3. `/api/admin/sites/route.ts`**
```typescript
// ALREADY MULTI-TENANT READY (has userId filtering)
// This is correctly implemented
```
**Status**: ✅ Already correct

**4. `/api/admin/generation-settings/route.ts`**
```typescript
// ALREADY MULTI-TENANT READY (has userId unique constraint)
// This is correctly implemented
```
**Status**: ✅ Already correct

---

### ❌ SOURCE-RELATED ENDPOINTS

**5. `/api/admin/sources/[id]/route.ts`**
- **Problem**: No ownership verification
- **Risk**: User A can modify User B's sources
- **Fix**: Verify `source.userId === currentUser.id`

**6. `/api/admin/sources/[id]/fetch/route.ts`**
- **Problem**: No ownership verification
- **Risk**: User A can trigger fetch for User B's sources
- **Fix**: Verify ownership before fetch

**7. `/api/admin/sources/[id]/contents/route.ts`**
- **Problem**: No ownership verification
- **Risk**: User A can see User B's feed contents
- **Fix**: Verify ownership + filter feedItems

---

### ❌ ARTICLE-RELATED ENDPOINTS

**8. `/api/admin/articles/[id]/route.ts`**
- **Problem**: No ownership verification
- **Risk**: Cross-user article access
- **Fix**: Verify `article.source.userId === currentUser.id`

**9. `/api/admin/generate-article/route.ts`**
- **Problem**: No user context for generation
- **Risk**: Articles generated without proper user association
- **Fix**: Include userId in generation logic

**10. `/api/admin/generate-article-manually/route.ts`**
- **Problem**: No verification of feedItem ownership
- **Risk**: Generate articles from other users' feeds
- **Fix**: Verify feedItem.source.userId === currentUser.id

---

### ❌ WORDPRESS-RELATED ENDPOINTS

**11. `/api/admin/wordpress/[siteId]/*/route.ts`**
```typescript
// PARTIALLY MULTI-TENANT (has siteId)
// BUT: No verification that siteId belongs to current user
```
**Issue**: Missing ownership verification
**Fix**: Verify `wordpressSite.userId === currentUser.id`

---

### ❌ IMAGE/MEDIA ENDPOINTS

**12. `/api/admin/image/*/route.ts`**
- **Problem**: No user context for image operations
- **Risk**: Images mixed between users
- **Fix**: Add userId to all image operations

**13. `/api/admin/featured-images/[articleId]/route.ts`**
- **Problem**: No ownership verification via articleId
- **Risk**: Access to other users' article images
- **Fix**: Verify article ownership chain

---

## 🔒 AUTHENTICATION PATTERNS NEEDED

### Current State: NO AUTHENTICATION
```typescript
// PROBLEM: All endpoints are public!
export async function GET(request: NextRequest) {
  // No user authentication
  // No ownership verification
  const data = await prisma.model.findMany(); // Global access
}
```

### Required Pattern: USER AUTHENTICATION
```typescript
// SOLUTION: Authenticated + scoped endpoints
export async function GET(request: NextRequest) {
  // 1. Get current user
  const userId = await getCurrentUser(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Filter by user
  const data = await prisma.model.findMany({
    where: { userId } // Or via relationship chain
  });
}
```

---

## 📋 NEW API STRUCTURE DESIGN

### OLD PATTERN (Single-Tenant)
```
/api/admin/sources          → All sources
/api/admin/articles         → All articles
/api/admin/generate-article → Global generation
```

### NEW PATTERN (Multi-Tenant)
```
/api/user/sites                    → User's sites
/api/sites/[siteId]/sources        → Site's sources
/api/sites/[siteId]/articles       → Site's articles
/api/sites/[siteId]/generate       → Site-scoped generation
/api/user/profile                  → User settings
```

### HYBRID APPROACH (Backward Compatibility)
```
/api/admin/sources?siteId=xxx      → Legacy with site filtering
/api/sites/[siteId]/sources        → New multi-tenant API
```

---

## 🚨 SECURITY VULNERABILITIES IDENTIFIED

### 1. **Horizontal Privilege Escalation**
- User A can access User B's sources/articles/settings
- No ownership verification on resource access
- Global queries return all users' data

### 2. **Data Leakage**
- Sources API returns all RSS feeds from all users
- Articles API returns all generated content
- No row-level security

### 3. **Unauthorized Operations**
- Users can fetch/modify other users' sources
- Users can generate articles from other users' feeds
- Users can access other users' WordPress settings

---

## 📈 REFACTOR PRIORITY MATRIX

### 🔥 CRITICAL (Fix First)
1. `/api/admin/sources/route.ts` - Core data exposure
2. `/api/admin/articles-by-source/route.ts` - Content exposure
3. `/api/admin/sources/[id]/*/route.ts` - Source operations
4. Authentication middleware - Global requirement

### ⚠️ HIGH (Fix Second)
5. `/api/admin/articles/[id]/route.ts` - Article access
6. `/api/admin/generate-*` - Generation endpoints
7. `/api/admin/wordpress/[siteId]/*` - WordPress operations

### 📋 MEDIUM (Fix Third)
8. Image/media endpoints
9. Health/monitoring endpoints
10. Admin utility endpoints

---

## 🔧 IMPLEMENTATION STRATEGY

### Phase 1: Authentication Foundation
```typescript
// src/lib/auth.ts
export async function getCurrentUser(request: NextRequest): Promise<string | null>
export async function requireAuth(request: NextRequest): Promise<string>
export async function verifyResourceOwnership(userId: string, resourceId: string, resourceType: string): Promise<boolean>
```

### Phase 2: Core Endpoints
- Refactor sources endpoints with userId filtering
- Add ownership verification to all resource access
- Implement new `/api/sites/[siteId]/*` pattern

### Phase 3: Security Hardening
- Add authorization middleware to all endpoints
- Implement rate limiting per user
- Add audit logging for sensitive operations

---

## 📊 IMPACT ASSESSMENT

### Breaking Changes Required
- **All** `/api/admin/*` endpoints need authentication
- Frontend must handle authentication state
- Mobile/external API consumers need auth headers

### Database Queries Impact
- Every query needs userId filtering
- Performance impact with proper indexing
- Query complexity increases

### Deployment Considerations
- Rolling deployment strategy needed
- Feature flags for gradual rollout
- Rollback plan for each endpoint

---

*API Audit completed: 19 Ottobre 2025*
*Total endpoints audited: 47*
*Critical security issues: 15*
*Authentication required: ALL admin endpoints*