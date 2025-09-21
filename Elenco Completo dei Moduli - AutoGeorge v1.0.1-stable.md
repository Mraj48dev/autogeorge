# Elenco Completo dei Moduli - AutoGeorge v1.0.1
## Guida Non Tecnica ai Componenti del Sistema

**Progetto:** AutoGeorge v1.0.1 - Piattaforma per la generazione automatica di articoli
**Stato:** Prototipo funzionante con architettura Clean/Hexagonal implementata
**Ultimo aggiornamento:** 21 Settembre 2025

---

## 1. MODULI PRINCIPALI IMPLEMENTATI

### 1.1 📝 **Content Module** - Il Cervello per gli Articoli
**Cosa fa:** È il modulo completo per la gestione degli articoli, implementato con Clean Architecture rigorosa e pattern Domain-Driven Design.

**Compiti principali:**
- Genera articoli tramite AI usando il caso d'uso `GenerateArticle`
- Gestisce entità `Article` con stati ben definiti
- Integrazione con servizi AI esterni (Perplexity)
- Admin Facade completo con CLI e HTTP endpoints
- Validazione rigorosa degli input con schemi JSON

**Architettura interna:**
- **Domain**: Entità `Article`, Value Objects, Events, Ports
- **Application**: Use Cases (`GenerateArticle`) con Result pattern
- **Infrastructure**: Repository, AI Service adapters, Logger
- **Admin**: Facade con supporto dry-run, health check, metriche

**Input (cosa riceve):**
- Prompt per generazione articolo
- Modello AI da utilizzare (llama-3.1-sonar-large-128k-online)
- Parametri: word count, temperatura, keywords, tono, stile
- ID fonte opzionale per collegamento

**Output (cosa produce):**
- Articolo completo con metadati
- Statistiche di generazione (token utilizzati, tempo, costi)
- Events di dominio per integrazione con altri moduli
- Log strutturati per auditing

**Livello di sviluppo:** 🟢 **COMPLETO** (95%) - Architettura Clean implementata

---

### 1.2 📡 **Sources Module** - Gestione Fonti di Contenuto
**Cosa fa:** Gestisce le fonti esterne da cui ricavare contenuti: RSS feeds, Telegram channels, calendari editoriali.

**Compiti principali:**
- Crea e configura fonti (`CreateSource` use case)
- Lista fonti con paginazione e filtri (`GetSources`)
- Recupera contenuti da fonti esterne (`FetchFromSource`)
- Gestisce stati delle fonti (attiva, paused, error)
- Test delle configurazioni prima del salvataggio

**Architettura interna:**
- **Domain**: Entità `Source`, Value Objects per configurazioni
- **Application**: Use Cases per CRUD e fetch operazioni
- **Infrastructure**: Adapters per RSS, Telegram, Database
- **Admin**: Facade con operazioni administrative

**Input (cosa riceve):**
- Configurazioni fonti (URL RSS, canali Telegram)
- Parametri di polling e filtri
- Richieste di fetch manuale

**Output (cosa produce):**
- Fonti configurate e monitorate
- Contenuti estratti dalle fonti
- Metadati di fetch (ultimo accesso, errori)
- Statistiche per fonte

**Livello di sviluppo:** 🟢 **COMPLETO** (90%) - Tutti i use case implementati

---

### 1.3 🏗️ **Shared Infrastructure** - Fondamenta Comuni
**Cosa fa:** Fornisce l'infrastruttura condivisa per tutti i moduli: database, logging, configurazione, types comuni.

**Compiti principali:**
- Connessione database PostgreSQL tramite Prisma
- Sistema di logging strutturato
- Result/Either pattern per gestione errori
- Base classes per Entity, ValueObject, UseCase
- Configurazione ambiente centralizzata

**Architettura interna:**
- **Database**: Client Prisma condiviso
- **Domain**: Base classes e types comuni
- **Application**: UseCase base class
- **Infrastructure**: Logger, configurazione

**Livello di sviluppo:** 🟢 **COMPLETO** (95%)

---

### 1.4 🔌 **Composition Root** - Dependency Injection
**Cosa fa:** Coordina l'inizializzazione di tutti i moduli e gestisce le dipendenze con un Container DI completo.

**Compiti principali:**
- Inizializzazione container DI con tutti i servizi
- Configurazione database e connessioni esterne
- Registrazione di repository, use cases, facades
- CLI per operazioni administrative
- Health checks di sistema

**Architettura interna:**
- Container DI con registrazione automatica
- CLI principale con comandi per ogni modulo
- Health check endpoints
- Gestione ciclo di vita applicazione

**Livello di sviluppo:** 🟢 **COMPLETO** (95%)

---

### 1.5 🖥️ **Next.js App Router** - Frontend e API
**Cosa fa:** Fornisce l'interfaccia utente web e gli endpoints API per l'amministrazione del sistema.

**Compiti principali:**
- Dashboard amministrativo responsive
- Forms per configurazione sources
- Endpoint API per tutti i moduli (/api/admin/*)
- Pagine per gestione articoli e generazione
- Autenticazione NextAuth integrata

**API Endpoints implementati:**
- `/api/admin/sources` - CRUD sources
- `/api/admin/sources/[id]/fetch` - Fetch da fonte specifica
- `/api/admin/sources/[id]/articles` - Articoli da fonte specifica
- `/api/admin/sources/test` - Test configurazione fonti
- `/api/admin/generate-article` - Generazione articoli
- `/api/health` - Health check sistema
- `/api/cron/poll-feeds` - Polling automatico feeds
- `/api/debug/rss-logs` - Debug logs RSS

**UI Components:**
- Dashboard con statistiche
- Source management interface
- Article generation forms
- Admin panels per ogni modulo
- RSS monitoring e debug tools

**Livello di sviluppo:** 🟡 **FUNZIONALE** (80%) - Core features implementate

---

## 2. MODULI DI SUPPORTO

### 2.1 📋 **Contracts** - Schemi di Validazione
**Cosa fa:** Definisce gli schemi JSON per validazione input/output tra moduli.

**Stato attuale:** 🟡 **PARZIALE** - Struttura base creata, schemi da completare

### 2.2 🧪 **Tests** - Suite di Test
**Cosa fa:** Test automatizzati per Domain entities, Use Cases e integrazione.

**Stato attuale:** 🟡 **IN SVILUPPO** - Setup Vitest + Playwright, test base implementati

## 3. COME I MODULI LAVORANO INSIEME

### Flusso tipico di creazione articolo:
1. **Dashboard** → Utente avvia generazione tramite `/admin/generate` page
2. **API Endpoint** → `/api/admin/generate-article` riceve la request
3. **Composition Root** → Container DI risolve le dipendenze (ContentAdminFacade)
4. **Content Module** → `GenerateArticle` use case elabora il prompt
5. **AI Service** → Chiamata a Perplexity API per generazione contenuto
6. **Article Repository** → Salvataggio nel database PostgreSQL
7. **Response** → Articolo generato ritorna al frontend con metadati

### Flusso gestione sources:
1. **Sources Admin** → Configurazione fonte tramite `/admin/sources`
2. **API Endpoint** → `/api/admin/sources` gestisce CRUD operations
3. **Sources Module** → Use cases (CreateSource, GetSources, FetchFromSource)
4. **External Adapters** → Connessione RSS feeds, Telegram channels
5. **Database** → Persistenza configurazioni e metadati fetch
6. **Monitoring** → Health checks e statistiche sources

### Flusso automatico polling:
1. **Cron Job** → `/api/cron/poll-feeds` attivato periodicamente
2. **Feed Polling Service** → Recupera contenuti da tutte le fonti attive
3. **FeedItem Storage** → Salva nuovi elementi nel database
4. **Article Generation** → Trigger automatico per articoli da feed items
5. **Debug Monitoring** → `/api/debug/rss-logs` per troubleshooting

---

## 4. VALUTAZIONE RISCHI NELLE MODIFICHE

### 🔴 **RISCHIO CRITICO** - Blocco totale del sistema:

**Shared Infrastructure (`src/shared/`):**
- **Database Client**: Modifica schema Prisma o connessione PostgreSQL
- **Result Types**: Cambio del pattern Result/Either pattern
- **Base Classes**: Entity, ValueObject, UseCase base
- **Impatto**: Sistema completamente non funzionante
- **File critici**: `src/shared/database/prisma.ts`, `src/shared/domain/types/Result.ts`

**Composition Root (`src/composition-root/`):**
- **Container DI**: Registrazione servizi e dipendenze
- **Database Config**: Inizializzazione connessioni
- **Impatto**: Applicazione non si avvia
- **File critici**: `src/composition-root/container.ts`, `src/composition-root/main.ts`

### 🟡 **RISCHIO ALTO** - Funzionalità principali compromesse:

**Content Module - Domain Layer:**
- **Article Entity**: Logica business degli articoli
- **Generate Use Case**: Core della generazione AI
- **Impatto**: Impossibile generare articoli
- **File critici**: `src/modules/content/domain/entities/Article.ts`, `src/modules/content/application/use-cases/GenerateArticle.ts`

**Sources Module - Core Logic:**
- **Source Entity**: Gestione configurazioni fonti
- **Fetch Use Cases**: Recupero contenuti esterni
- **Impatto**: Sources non funzionanti
- **File critici**: `src/modules/sources/domain/entities/Source.ts`

**Database Schema (Prisma):**
- **Migrations**: Cambio struttura tabelle
- **Relations**: Modifiche alle foreign keys
- **Impatto**: Data corruption o incompatibilità
- **File critico**: `prisma/schema.prisma`

### 🟡 **RISCHIO MEDIO** - Problemi di integrazione:

**Admin Facades:**
- **API Contracts**: Cambio signature metodi
- **Validation Logic**: Modifica regole validazione
- **Impatto**: API endpoints non funzionanti
- **File a rischio**: `src/modules/*/admin/*AdminFacade.ts`

**Infrastructure Adapters:**
- **Repository Implementations**: Cambio query database
- **External Service Clients**: Integrazione AI/RSS
- **Impatto**: Perdita dati o servizi esterni non raggiungibili

### 🟢 **RISCHIO BASSO** - Modifiche sicure:

**Next.js App Router UI:**
- **Page Components**: Aspetto pagine admin
- **Form Components**: Styling e layout
- **Dashboard Visualizations**: Grafici e statistiche
- **File sicuri**: `src/app/admin/**/*.tsx`

**Admin API Routes:**
- **HTTP Handling**: Response formatting
- **Error Messages**: Messaggi user-friendly
- **File sicuri**: `src/app/api/admin/**/*.ts` (solo formatting)

**Logging e Monitoring:**
- **Log Messages**: Formato e verbosity
- **Health Check Details**: Aggiunta metriche
- **File sicuri**: `src/shared/infrastructure/monitoring/`

## 5. PRIORITÀ DI SVILUPPO ATTUALE

### ✅ **COMPLETATO**:
1. **Architettura Clean/Hexagonal** - Domain, Application, Infrastructure layers
2. **Moduli Core** - Content e Sources con use cases completi
3. **Database Design** - Schema Prisma con PostgreSQL
4. **Admin Interfaces** - Facades con CLI e HTTP endpoints
5. **Next.js Frontend** - Dashboard e API routes funzionanti
6. **RSS Polling System** - Sistema automatico di polling feeds
7. **Debug Tools** - Monitoring e troubleshooting RSS

### 🔄 **IN CORSO**:
1. **Test Coverage** - Espansione suite Vitest + Playwright
2. **JSON Schemas** - Validazione contracts tra moduli
3. **Error Handling** - Standardizzazione across tutti i moduli
4. **UI/UX Polish** - Miglioramento interfacce admin

### 📋 **ROADMAP PROSSIMI SVILUPPI**:
1. **Autenticazione Completa** - NextAuth.js roles e permissions
2. **Publishing Module** - Integrazione WordPress/CMS esterni
3. **Billing System** - Token management e pagamenti
4. **Monitoring Avanzato** - Metriche e alerting production
5. **Sites Management** - Multi-tenant per gestione più siti

### ⚠️ **RACCOMANDAZIONI CRITICHE**:
- **Mai toccare** `src/shared/` senza test completi
- **Sempre testare** modifiche al Composition Root
- **Backup database** prima di migration Prisma
- **Usare dry-run** per test Admin Facades
- **Validare input** prima di ogni use case execution

---

## 6. INFORMAZIONI TECNICHE AGGIORNATE

**Architettura:** Clean Architecture + Hexagonal + Domain-Driven Design
**Pattern:** Result/Either, Dependency Injection, CQRS, Repository
**Linguaggio:** TypeScript 5.9+ (Next.js 15 + React 18)
**Totale righe di codice:** **~17.376 linee** (87 file TS/TSX)
**Database:** PostgreSQL con Prisma ORM 5.8
**AI Provider:** Perplexity API (llama-3.1-sonar-large-128k-online)
**Frontend:** Tailwind CSS + Shadcn/ui components
**Testing:** Vitest + Playwright + Testing Library
**Deploy:** Vercel-ready con vercel.json configurato

### **Moduli Implementati:**
- ✅ **Content Module**: `src/modules/content/` (Domain, Application, Infrastructure, Admin)
- ✅ **Sources Module**: `src/modules/sources/` (Domain, Application, Infrastructure, Admin)
- ✅ **Shared Infrastructure**: `src/shared/` (Database, Types, Base Classes, Logger)
- ✅ **Composition Root**: `src/composition-root/` (DI Container, CLI, Health Checks)
- ✅ **Next.js App**: `src/app/` (Admin UI, API Routes, Dashboard)

### **Database Schema (PostgreSQL):**
- `articles` - Contenuti generati con metadati
- `sources` - Configurazioni fonti esterne (RSS, Telegram)
- `feed_items` - Elementi estratti dai feed RSS per processing
- `users` - Autenticazione NextAuth.js
- `accounts` + `sessions` - OAuth e sessioni
- `verification_tokens` - Token di verifica email/auth

### **API Endpoints Funzionanti:**
- `GET/POST /api/admin/sources` - Gestione sources
- `GET/PUT/DELETE /api/admin/sources/[id]` - CRUD source specifica
- `POST /api/admin/sources/[id]/fetch` - Fetch specifico
- `GET /api/admin/sources/[id]/articles` - Articoli da fonte specifica
- `POST /api/admin/sources/test` - Test configurazione fonte
- `POST /api/admin/generate-article` - Generazione AI
- `GET /api/health` - System health check
- `POST /api/cron/poll-feeds` - Polling automatico feeds
- `GET /api/debug/rss-logs` - Debug logs RSS

**Data ultimo aggiornamento:** 21 Settembre 2025
**Versione:** v1.0.1-stable
**Analisi:** Codebase completo e aggiornato

---

## 📊 **RIEPILOGO STATO MODULI**

| Modulo | Completezza | Rischio Modifica | Note |
|--------|-------------|------------------|------|
| 📝 Content | 🟢 95% | 🟡 Alto | Core business logic implementato |
| 📡 Sources | 🟢 90% | 🟡 Alto | Use cases completi, monitoring attivo |
| 🏗️ Shared | 🟢 95% | 🔴 Critico | Fondamenta sistema, non toccare |
| 🔌 Composition Root | 🟢 95% | 🔴 Critico | DI container, avvio sistema |
| 🖥️ Next.js App | 🟡 80% | 🟢 Basso | UI funzionale, sicura da modificare |
| 📋 Contracts | 🟡 40% | 🟡 Medio | Schemi validazione da completare |
| 🧪 Tests | 🟡 50% | 🟢 Basso | Coverage base, espandibile |