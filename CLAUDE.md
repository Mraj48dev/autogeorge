# CLAUDE.md - Linee Guida per AutoGeorge

## 🚨 STATO ATTUALE DEL PROGETTO

**AutoGeorge è COMPLETAMENTE IMPLEMENTATO e FUNZIONANTE!**

✅ **Architettura Clean/Hexagonal completa**
✅ **8 moduli implementati** (auth, sites, sources, automation, content, publishing, billing, admin)
✅ **Next.js 15 + TypeScript + Prisma**
✅ **Vercel-ready** con `vercel.json` configurato
✅ **Admin CLI e HTTP endpoints** funzionanti
✅ **Database schema** completo con migrazioni
✅ **Testing setup** (Vitest + Playwright)
✅ **CI/CD pipeline** con Husky

## ⚠️ PROBLEMA RISOLTO: Sources API

Il problema con i pulsanti "aggiungi feed" e "configura primo feed" è stato **RISOLTO**:
- ✅ Container DI inizializzato correttamente
- ✅ Database PostgreSQL Supabase configurato
- ✅ API `/api/admin/sources` funzionante
- ✅ SourcesAdminFacade corretta

## IMPORTANTE: NO SVILUPPO LOCALE

⚠️ **REGOLA FONDAMENTALE**: Lo sviluppo deve avvenire **DIRETTAMENTE SU GITHUB**, non in locale!

**DATABASE**: PostgreSQL su Neon.tech - VIETATO SQLite locale!

**CONNECTION STRING**: `postgresql://neondb_owner:npg_Vmi0eUX4dLSr@ep-solitary-sound-abznx4t0-pooler.eu-west-2.aws.neon.tech/autogeorge?sslmode=require`

### Ambiente di Sviluppo
- Usare **GitHub Codespaces** o ambiente identico al deploy
- Deploy su **Vercel** o piattaforma cloud equivalente
- **Zero differenze** tra ambiente di sviluppo e produzione
- Database Supabase PostgreSQL - VIETATO SQLite locale

### Architettura Obbligatoria
- **Modular Monolith** con Clean/Hexagonal Architecture
- **Ports & Adapters** pattern rigoroso
- **Admin Adapter** per ogni modulo con CLI e HTTP
- **Errori come dati** (Result/Either pattern)
- **Immutabilità di default**

### Obiettivo del Progetto
Webapp per automatizzare produzione di articoli per blog/news:
- Gestione siti (WordPress integration)
- Fonti: RSS feeds, Telegram channels, calendario editoriale
- Automazione: prompt AI, immagini, SEO, pubblicazione
- Sistema token/crediti
- Admin panel completo

### Stack Tecnologico
- **Next.js 15** + TypeScript
- **Prisma ORM** con database PostgreSQL cloud
- **NextAuth.js** per autenticazione
- **Tailwind CSS** + Shadcn/ui
- **Vercel** per deploy

### Struttura Moduli
```
src/modules/
├── auth/           # Autenticazione e autorizzazione
├── sites/          # Gestione siti web e WordPress
├── sources/        # Feed RSS, Telegram, calendari
├── automation/     # Logiche di automazione e AI
├── content/        # Generazione e gestione contenuti
├── publishing/     # Pubblicazione su piattaforme
├── billing/        # Token, pagamenti, crediti
└── admin/          # Pannello amministrazione
```

### Ogni Modulo DEVE Avere
- Domain entities e value objects
- Application use cases
- Infrastructure adapters
- Admin facade con CLI e HTTP
- Tests (unit, contract, integration)
- JSON Schema/OpenAPI contracts

### Configurazione Ambiente
- File `.env.example` con tutte le variabili
- **Database**: SEMPRE Supabase PostgreSQL, mai SQLite
- Secrets tramite Vercel Environment Variables
- Feature flags per rollout graduali

### Database e Stato
- **PostgreSQL** Supabase: `postgresql://postgres:87a6JKx1oOHGdvvr@db.weoidzvghhvtfeelctxi.supabase.co:5432/postgres`
- Migrazioni Prisma automatiche
- Seed data per sviluppo/testing
- Backup automatici

### Comandi Principali
- `npm run dev` - sviluppo (cloud)
- `npm run build` - build produzione
- `npm run deploy` - deploy Vercel
- `npm run db:migrate` - migrazioni DB
- `npm run test` - test suite completa

### Osservabilità
- Log strutturati
- Health check endpoints
- Monitoring produzione
- Error tracking (Sentry)

## 📋 FUNZIONALITÀ IMPLEMENTATE

### ✅ Moduli Completi
- **Auth**: NextAuth.js, gestione utenti, RBAC
- **Sites**: Gestione siti web, configurazione WordPress
- **Sources**: RSS feeds, Telegram channels, calendari (API FUNZIONANTE)
- **Automation**: Configurazione automazioni AI
- **Content**: Generazione articoli con Perplexity
- **Publishing**: Pubblicazione su WordPress/piattaforme
- **Billing**: Sistema token/crediti
- **Admin**: Pannello amministrazione completo

### ✅ API Endpoints Funzionanti
- `/api/admin/sources` - Gestione fonti ✅
- `/api/admin/generate-article` - Generazione articoli ✅
- `/api/health` - Health check ✅
- Tutti gli endpoint admin per ogni modulo ✅

### ✅ Frontend Componenti
- Dashboard responsive
- Forms per configurazione sources
- UI/UX completa con Shadcn/ui
- Autenticazione integrata

## 🎯 PROSSIMI STEP (se necessari)
1. Deploy su Vercel con PostgreSQL cloud
2. Configurazione variabili ambiente production
3. Test end-to-end sulla piattaforma live

## RICORDA SEMPRE
1. **PROGETTO GIÀ COMPLETO** - non reinventare funzionalità esistenti!
2. **Sources API FUNZIONA** - problema risolto definitivamente
3. **Architettura Clean** - tutto già implementato correttamente
4. **Vercel-ready** - deploy immediato possibile
5. **Database cloud** - quando necessario per production