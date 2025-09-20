## Idea Progettuale

Vorrei creare una webapp che permetta di automatizzare la produzione di articoli da pubblicare su siti quali blog, siti di news ecc...
L'utente, debitamente loggato e con un numero di token sufficienti, dovrebbe poter:
* creare l'anagrafica del sito (con Nome e indirizzo web) se wordpress dovrebbe inserire i dati necessari per poter pubblicare l'articolo
* inserire le fonti (di 3 tipi: feed rss, canali telegram, calendario editoriale)
* Impostare i settaggi dell'automazione: 
   * personalizzare il prompt per la generazione dell'articolo (di default scritto da perplexity con account della piattaforma, non dell'utente)
   * immagine in evidenza (l'utente può scegliere tra una ricerca su un sito di immagine gratuite come pixabay o generazione dell'immagine da chatgpt con account della piattaforma, non dell'utente)
   * generazione campi seo (l'utente può scegliere se farli generare da chatgpt o meno)
   * pubblicazione: se il sito è in wordpress può scegliere se pubblicare o inserire l'articolo in bozza oppure se visualizzarlo sulla piattaforma per poi fare un copia/incolla in autonomia
* acquistare token
* controllare i log
L'amministratore potrà gestire tutte le anagrafiche, tutti i log, tutti gli acquisti e regalare token agli utenti.

# Prompt di Kickoff – Vibe Coding (IT)

## Ruolo & Obiettivo
Agisci come **lead architect** e **code generator**.  
Genera uno scheletro di progetto pronto all’uso, con esempi concreti, basato su: **modular programming**, **Clean/Hexagonal Architecture (Ports & Adapters)**, **low coupling**, **high cohesion**, **immutabilità di default**, **errori come dati**, **composition root sottile** e **admin adapter per ogni modulo**.  

Prima di iniziare:
* **Individua e proponi lo stack tecnologico più adatto** (linguaggio, framework, tooling) in base alla descrizione del progetto.
* Tutto il codice deve contenere **commenti abbondanti e chiari**, per spiegare scelte architetturali, invarianti e motivazioni.
* Lo sviluppo deve avvenire **direttamente su GitHub**, garantendo **ambiente di sviluppo riproducibile e identico a quello di deploy** (ad esempio Vercel), evitando differenze tra locale e produzione.

---

## Requisiti Architetturali (vincolanti)

1. **Modular Monolith ben partizionato**  
   * Ogni modulo = **bounded context** con API interne stabili.  
   * **Alta coesione** interna, **basso accoppiamento** tra moduli.

2. **Clean / Architettura Esagonale**  
   * Strati: **domain**, **application**, **infrastructure**, **app (bootstrap/composition-root)**.  
   * **Ports (interfacce)** in domain e application; **Adapters** in infrastructure/edge.  
   * Il **composition root** avvia configurazione e wiring delle dipendenze — **nessuna logica di dominio**.

3. **Contratti e Tipi Ricchi**  
   * Modella invarianti con **value objects** o **ADT/union types**.  
   * Errori come dati (`Result`/`Either`, `Option`), senza eccezioni per flussi attesi.  
   * Pubblica **JSON Schema** o **OpenAPI** per tutte le interfacce esterne.

4. **Interfaccia di Amministrazione per Modulo (Admin Adapter)**  
   * Ogni modulo deve includere una **Admin Facade** che esponga:
     - `listUseCases()`
     - `validate(input)` (JSON Schema/OpenAPI)
     - `execute(useCase, input, { dryRun, idempotencyKey, sandbox })`
   * Fornisci **CLI** e **HTTP** (protetti) che delegano ai servizi applicativi del modulo.  
   * Supporto a **dry-run** e fixture/sandbox; log di tutte le azioni di admin per auditing.

5. **Testabilità & Qualità**  
   * Test obbligatori: **unit** (dominio), **contract/consumer** (porte), **integration** (adapters).  
   * Tutte le operazioni mutanti devono essere **idempotenti** e accettare `Idempotency-Key`.  
   * Pipeline CI pronta con lint/format e typecheck.

6. **Observability**  
   * Log strutturati, tracing opzionale, metriche di base.  
   * Endpoint di health e readiness.

7. **Sicurezza & Configurazione**  
   * Configurazione secondo i **12-factor**; nessun segreto nel repo.  
   * RBAC “admin” per gli adapter di amministrazione (pieno in dev/staging, limitato in prod).  
   * **Feature flag** per modifiche rischiose o migrazioni.

8. **Event-Driven (opzionale)**  
   * Quando serve, pubblica **eventi di dominio** dal layer application e documentali con AsyncAPI.

9. **Ambiente & Deploy**  
   * **Sviluppo diretto su GitHub** — niente setup “solo locale”.  
   * Fornisci ambiente di sviluppo **contenizzato o standardizzato** (Docker/Dev Containers, Nix, ecc.) per garantire **parità assoluta** tra GitHub Codespaces, sviluppo locale e deploy su Vercel o simili.

---

## Output Richiesto (in un’unica risposta)

### A. Struttura Cartelle (albero)
Mostra l’albero completo del progetto con almeno due moduli di esempio (es. `orders`, `payments`) e tutti i file chiave.

### B. File Chiave con Contenuto Reale
* `app/main.{ext}` – composition root sottile (config, DI, wiring, avvio HTTP/CLI).  
* `domain/**` – entità, value objects, porte, eventi di dominio.  
* `application/**` – use case che dipendono solo da porte.  
* `infrastructure/**` – adapter concreti (DB, HTTP client, queue, repository).  
* `admin/**` – Admin Facade per modulo + adapter CLI e HTTP.  
* `contracts/**` – JSON Schema/OpenAPI per input/output.  
* `tests/**` – unit + contract + integration.  
* `scripts/**` – seed/fixtures.  
* `observability/**` – logger, middleware tracing/metrics.  
* `README.md` – istruzioni per setup, uso di GitHub Codespaces/Vercel, comandi principali.  
* File di configurazione (es. `Dockerfile`, `docker-compose`, `devcontainer.json`) per garantire identità dell’ambiente.

### C. Esempi Concreti
1. **Use case** `PlaceOrder`  
   * Legge dati da porta `Carts`, chiama `Payments`, scrive su `Orders`.  
   * Restituisce `Result` tipizzato.  
   * Pubblica evento `OrderPlaced` (opzionale).  
2. **Admin Adapter** per `orders`  
   * CLI: `orders-admin execute PlaceOrder --input examples/place-order.json --dry-run`.  
   * HTTP: `POST /admin/orders/execute/PlaceOrder` con validazione schema.  
3. **Test**  
   * Unit test del dominio con casi limite.  
   * Contract test per la porta `Payments`.  
   * Integration test dell’admin HTTP con `dryRun`.  
4. **Observability**  
   * Log strutturati dell’esecuzione UC (input redatto, esito, latenza).

### D. Regole “Do/Don’t” (riassunto nel README)
* **Do:** interfacce stabili tra moduli, immutabilità di default, errori come dati, feature flag, ADR brevi, **commenti abbondanti e chiari nel codice**.  
* **Don’t:** logica nel `main`, dipendenze tra moduli tramite tipi concreti (usare porte), riflessione “magica” che riduce testabilità, o ambienti di sviluppo divergenti dal deploy.

---

## Parametri e Varianti (da compilare)
* Database/Storage: **{{DB}}** (oppure repo in-memory per demo).  
* Framework HTTP: **{{FRAMEWORK}}**.  
* Tooling: **{{TOOLING}}** (lint, formatter, test runner).  
* Packaging/Deploy: **{{DEPLOY}}** (facoltativo).

---

## Stile del Codice
* **Pulito e fortemente tipizzato**.  
* **Commenti abbondanti** che spieghino invarianti, motivazioni e decisioni architetturali.  
* Nomi espliciti, nessun boilerplate inutile.

---

## Criteri di Accettazione Automatici
* Il progetto **compila** e passa il **typecheck**.  
* `npm test` / `cargo test` / `pytest -q` → tutti i test verdi.  
* CLI e endpoint admin funzionano in **modalità dry-run**.  
* I moduli non importano mai classi concrete tra loro, solo **porte**.  
* Nessuna logica di dominio nel `main`.  
* Ambiente di sviluppo e di deploy (GitHub Codespaces / Vercel / locale) **identici e riproducibili**.

---

### Note Finali
Se una scelta è ambigua, preferisci **semplicità**, **testabilità** e **chiara separazione dei confini**.  
Mantieni contratti stabili: l’interno di ogni modulo può evolvere liberamente.  
Verifica sempre che l’ambiente GitHub (ad es. Codespaces) e quello di deploy (Vercel) siano **perfettamente allineati**.