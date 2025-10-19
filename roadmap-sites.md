# 🗺️ ROADMAP MULTI-TENANT: DA SINGLE-SITE A MULTI-SITE

## 📋 OVERVIEW

**Obiettivo**: Trasformare AutoGeorge da sistema single-tenant (1 utente = 1 sito) a multi-tenant (1 utente = N siti) usando Row-Level Security (RLS).

**Approccio**: Big Bang - Stop sviluppo features, ristrutturazione completa in 10-15 giorni.

**Pattern Scelto**: OPZIONE A - Row-Level Security con `userId` in ogni tabella.

---

## 🚨 PRE-REQUISITI CRITICI

### BACKUP COMPLETO
```bash
# ESEGUIRE PRIMA DI INIZIARE
./scripts/backup-database.sh
git tag -a "pre-multitenant-backup" -m "Backup before multi-tenant refactor"
git push --tags
```

### AMBIENTE TESTING
- [ ] Clonare database di produzione in ambiente test
- [ ] Verificare che tutti i test passino pre-refactor
- [ ] Documentare configurazione corrente

---

## 📊 FASE 1: AUDIT E ANALISI (Giorni 1-2)

### 1.1 AUDIT DIPENDENZE SINGLE-TENANT

**Database Schema Audit:**
- [ ] Identificare tutte le tabelle senza `userId`
- [ ] Mappare relazioni esistenti che assumono "single-site"
- [ ] Documentare foreign keys da modificare

**Tabelle da modificare (stima iniziale):**
```
✅ GIÀ MULTI-TENANT:
- users (ha già concetto di utenti)
- wordpress_sites (già collegata a userId)

❌ DA CONVERTIRE:
- sources (manca userId)
- articles (ha wordpressSiteId ma non diretto userId)
- feed_items (via sourceId, indiretto)
- generation_settings (ha userId, ok)
- publications (via articleId, indiretto)
- featured_images (via articleId, indiretto)
- health_checks (globali, forse ok)
- system_alerts (globali, forse ok)
```

**API Endpoints Audit:**
- [ ] Listrare tutti gli endpoint in `src/app/api/admin/`
- [ ] Identificare hardcoded assumptions su "single site"
- [ ] Documentare endpoint che necessitano site context

**Frontend Components Audit:**
- [ ] Identificare componenti che assumono "single site"
- [ ] Mappare navigation patterns da modificare
- [ ] Documentare stato globale vs site-scoped

### 1.2 DESIGN NUOVO SCHEMA

**User → Sites → Resources Hierarchy:**
```
User (1) → WordPress Sites (N)
WordPress Site (1) → Sources (N)
Source (1) → Feed Items (N)
Source (1) → Articles (N)
Article (1) → Publications (N)
Article (1) → Featured Images (N)
```

**Nuovo pattern URL:**
```
VECCHIO: /admin/sources
NUOVO:   /admin/sites/[siteId]/sources

VECCHIO: /api/admin/sources
NUOVO:   /api/sites/[siteId]/sources
```

---

## 🗄️ FASE 2: DATABASE RESTRUCTURING (Giorni 3-5)

### 2.1 SCHEMA MIGRATIONS

**Step 1: Aggiungere userId alle tabelle**
```sql
-- sources table
ALTER TABLE sources ADD COLUMN userId TEXT;
UPDATE sources SET userId = (SELECT id FROM users LIMIT 1); -- Migrazione dati esistenti
ALTER TABLE sources ALTER COLUMN userId SET NOT NULL;

-- Ripetere per altre tabelle necessarie
```

**Step 2: Creare/Aggiornare Foreign Keys**
```sql
-- sources → users relationship
ALTER TABLE sources ADD CONSTRAINT fk_sources_user
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

-- Aggiornare altri FK necessari
```

**Step 3: Creare Indexes per Performance**
```sql
CREATE INDEX idx_sources_user_id ON sources(userId);
CREATE INDEX idx_articles_user_site ON articles(wordpressSiteId, sourceId);
-- Altri indici necessari
```

### 2.2 PRISMA SCHEMA UPDATE

**Aggiornare `prisma/schema.prisma`:**
- [ ] Aggiungere `userId` ai modelli necessari
- [ ] Definire relazioni User → Sites → Resources
- [ ] Aggiornare @@index per performance multi-tenant

**Esempio Source model:**
```prisma
model Source {
  id              String     @id @default(cuid())
  userId          String     // NUOVO CAMPO
  name            String
  type            String
  // ... altri campi esistenti
  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... altre relazioni esistenti

  @@index([userId])         // NUOVO INDEX
  @@index([userId, type])   // NUOVO INDEX COMPOSITO
}
```

### 2.3 DATA MIGRATION SCRIPTS

**Script migrazione dati esistenti:**
- [ ] Assegnare tutte le risorse esistenti al primo utente
- [ ] Verificare integrità referenziale
- [ ] Creare script rollback

```typescript
// scripts/migrate-to-multitenant.ts
export async function migrateExistingData() {
  const firstUser = await prisma.user.findFirst();

  // Assegnare sources al primo utente
  await prisma.source.updateMany({
    where: { userId: null },
    data: { userId: firstUser.id }
  });

  // Verificare che tutto sia coerente
  // ...
}
```

---

## 🔧 FASE 3: API LAYER REFACTOR (Giorni 6-8)

### 3.1 AUTHENTICATION MIDDLEWARE

**Creare middleware per user context:**
```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  // Verificare autenticazione
  // Estrarre userId da session/token
  // Passare userId ai request headers
}
```

**Auth utilities:**
```typescript
// src/lib/auth-context.ts
export async function getCurrentUser(request: NextRequest): Promise<string> {
  // Estrarre userId da request
}

export async function getUserSites(userId: string): Promise<Site[]> {
  // Restituire solo i siti dell'utente
}
```

### 3.2 API ENDPOINTS REFACTOR

**Pattern 1: Site-Scoped Endpoints**
```
VECCHIO: /api/admin/sources
NUOVO:   /api/sites/[siteId]/sources

VECCHIO: /api/admin/articles
NUOVO:   /api/sites/[siteId]/articles
```

**Pattern 2: User-Scoped Endpoints**
```
NUOVO: /api/user/sites (lista siti utente)
NUOVO: /api/user/profile
```

**Implementazione tipo:**
```typescript
// src/app/api/sites/[siteId]/sources/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const userId = await getCurrentUser(request);

  // Verificare che l'utente possieda il sito
  const site = await prisma.wordPressSite.findUnique({
    where: { id: params.siteId, userId }
  });

  if (!site) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  // Restituire solo sources di questo sito + utente
  const sources = await prisma.source.findMany({
    where: { userId, /* siteId logic */ }
  });
}
```

### 3.3 BACKWARD COMPATIBILITY (TEMPORANEA)

**Durante transizione, mantenere endpoint legacy:**
```typescript
// /api/admin/sources → redirect to first site
export async function GET(request: NextRequest) {
  const userId = await getCurrentUser(request);
  const firstSite = await getUserSites(userId)[0];

  // Redirect to new endpoint
  return NextResponse.redirect(`/api/sites/${firstSite.id}/sources`);
}
```

---

## 🎨 FASE 4: FRONTEND REFACTOR (Giorni 9-11)

### 4.1 STATE MANAGEMENT

**Site Context Provider:**
```typescript
// src/contexts/SiteContext.tsx
interface SiteContextType {
  currentSite: Site | null;
  userSites: Site[];
  switchSite: (siteId: string) => void;
  loading: boolean;
}

export function SiteProvider({ children }) {
  // Gestire sito corrente
  // Persistere selezione in localStorage
  // Fornire utilities per switching
}
```

**URL Structure:**
```
VECCHIO: /admin/sources
NUOVO:   /admin/sites/[siteId]/sources

VECCHIO: /admin/articles
NUOVO:   /admin/sites/[siteId]/articles
```

### 4.2 NAVIGATION REFACTOR

**Eliminare dualismo admin/sites:**
- [ ] Rimuovere `/admin/sites/layout.tsx` separato
- [ ] Unificare in un solo admin layout
- [ ] Site selector in header principale

**Nuovo layout structure:**
```
/admin
├── layout.tsx (con site selector)
├── page.tsx (redirect a /admin/sites)
└── sites/
    ├── page.tsx (site selection se nessuno scelto)
    └── [siteId]/
        ├── dashboard/
        ├── sources/
        ├── articles/
        └── settings/
```

### 4.3 COMPONENTS REFACTOR

**Site Selector Component:**
```typescript
// src/components/SiteSelector.tsx
export function SiteSelector() {
  const { currentSite, userSites, switchSite } = useSiteContext();

  return (
    <select value={currentSite?.id} onChange={switchSite}>
      {userSites.map(site => (
        <option key={site.id} value={site.id}>{site.name}</option>
      ))}
    </select>
  );
}
```

**Breadcrumb Navigation:**
```typescript
// src/components/Breadcrumb.tsx
// Home > Sites > [Site Name] > Sources
```

---

## 🔄 FASE 5: BUSINESS LOGIC UPDATE (Giorni 12-13)

### 5.1 RSS POLLING MULTI-TENANT

**Cron job update:**
```typescript
// /api/cron/poll-feeds
export async function GET() {
  // Per ogni utente
  const users = await prisma.user.findMany({ where: { isActive: true } });

  for (const user of users) {
    const sources = await prisma.source.findMany({
      where: { userId: user.id, isActive: true }
    });

    for (const source of sources) {
      await pollFeedForSource(source, user.id);
    }
  }
}
```

### 5.2 ARTICLE GENERATION SCOPED

**Generazione per sito specifico:**
```typescript
// Assicurarsi che la generazione articoli rispetti:
// 1. userId ownership
// 2. Pubblicazione sul sito corretto
// 3. Utilizzo settings utente specifico
```

### 5.3 BILLING & QUOTAS

**Per implementazione futura:**
- [ ] Tracking usage per user
- [ ] Limits per subscription tier
- [ ] Quota management per site

---

## 🧪 FASE 6: TESTING & MIGRATION (Giorni 14-15)

### 6.1 DATA MIGRATION FINALE

**Script migrazione produzione:**
```bash
# 1. Backup finale
./scripts/backup-database.sh

# 2. Eseguire migrazioni
npx prisma db push

# 3. Eseguire script migrazione dati
npm run migrate:multitenant

# 4. Verificare integrità
npm run verify:migration
```

### 6.2 TESTING MULTI-TENANT

**Test scenarios:**
- [ ] Creare 2+ utenti test
- [ ] Ogni utente crea siti diversi
- [ ] Verificare isolamento dati
- [ ] Test performance con più siti

**Security tests:**
- [ ] Utente A non vede dati Utente B
- [ ] API autorizzazione corretta
- [ ] Session hijacking protection

### 6.3 ROLLBACK PLAN

**Se qualcosa va male:**
```bash
# 1. Rollback database
./scripts/restore-database.sh backup_file.sql

# 2. Deploy versione precedente
git revert HEAD~N
git push

# 3. Verificare funzionalità
```

---

## ✅ CHECKLIST FINALE

### BEFORE GO-LIVE
- [ ] Tutti i test passano
- [ ] Performance accettabile con dati multi-tenant
- [ ] Backup verificati e funzionanti
- [ ] Documentazione aggiornata

### GO-LIVE
- [ ] Deploy in orario di basso traffico
- [ ] Monitoring attivo
- [ ] Rollback plan pronto

### POST GO-LIVE
- [ ] Verificare che utenti esistenti funzionino
- [ ] Test creazione nuovi utenti/siti
- [ ] Monitoring performance
- [ ] Feedback raccolta

---

## 📚 DOCUMENTATION UPDATES

- [ ] Aggiornare README.md
- [ ] Documentare nuova API structure
- [ ] Guide per sviluppatori
- [ ] Schema database documentation

---

## 🚨 NOTES & WARNINGS

1. **BREAKING CHANGES**: Questa migrazione è breaking, richiede aggiornamento URL e potenziale re-login utenti
2. **DATA LOSS RISK**: SEMPRE fare backup prima di ogni step
3. **PERFORMANCE**: Monitorare performance con dati multi-tenant
4. **SECURITY**: Verificare SEMPRE isolamento dati tra utenti

---

## 🎯 SUCCESS CRITERIA

✅ **Utenti multipli possono:**
- Creare account separati
- Gestire siti independenti
- Non vedere dati di altri utenti

✅ **Sistema:**
- Performance accettabile
- Sicurezza guaranteed
- Backup/restore funzionanti

✅ **Business:**
- AutoGeorge è vendibile
- Scalabile per più clienti
- Pronto per SaaS model

---

*Documento creato: 19 Ottobre 2025*
*Ultima modifica: [DATA]*
*Stato: READY TO EXECUTE*