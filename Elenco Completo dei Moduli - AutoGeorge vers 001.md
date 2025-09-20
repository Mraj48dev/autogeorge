# Elenco Completo dei Moduli - AutoGeorge
## Guida Non Tecnica ai Componenti del Sistema

**Progetto:** AutoGeorge v1.0.1 - Piattaforma per la generazione automatica di articoli
**Stato:** Prototipo funzionante pronto per test iniziali

---

## 1. MODULI PRINCIPALI

### 1.1 📝 **Content Module** - Il Cervello per gli Articoli
**Cosa fa:** È il cuore del sistema che si occupa di creare, gestire e salvare gli articoli generati dall'intelligenza artificiale.

**Compiti principali:**
- Riceve le richieste di creazione articoli
- Chiama l'AI (Perplexity) per generare il contenuto
- Controlla che l'articolo creato sia valido
- Salva l'articolo nel database
- Gestisce gli stati dell'articolo (bozza → generato → pronto → pubblicato)

**Input (cosa riceve):**
- Argomento/prompt per l'articolo
- Parametri di generazione (lunghezza, tono, stile)
- Lingua di destinazione
- Parole chiave da includere

**Output (cosa produce):**
- Articolo completo con titolo e contenuto
- Statistiche (numero parole, tempo di lettura)
- Metadati SEO
- Informazioni sui costi di generazione

**Livello di sviluppo:** 🟢 **COMPLETO** (85-90%)

---

### 1.2 🏗️ **Shared Module** - Le Fondamenta Comuni
**Cosa fa:** Fornisce gli strumenti base che tutti gli altri moduli usano per funzionare. È come la "cassetta degli attrezzi" comune.

**Compiti principali:**
- Gestisce gli errori in modo uniforme
- Fornisce il sistema di logging (registrazione eventi)
- Definisce le regole base per tutti i dati
- Configura le impostazioni dell'ambiente

**Input (cosa riceve):**
- Variabili di configurazione del sistema
- Eventi da registrare nei log

**Output (cosa produce):**
- Strumenti pronti per gli altri moduli
- Log di sistema strutturati
- Gestione standardizzata degli errori

**Livello di sviluppo:** 🟡 **PARZIALE** (60-70%)

---

### 1.3 🖥️ **App Router Module** - L'Interfaccia Utente
**Cosa fa:** È quello che vede e usa l'utente finale. Crea le pagine web e gestisce le interazioni.

**Compiti principali:**
- Mostra la pagina principale del sito
- Fornisce il pannello di amministrazione
- Gestisce i form per creare articoli
- Espone le API per comunicare con il sistema

**Input (cosa riceve):**
- Richieste degli utenti dalle pagine web
- Dati dai form di inserimento
- Chiamate API esterne

**Output (cosa produce):**
- Pagine web visualizzabili nel browser
- Risposte JSON dalle API
- Interfaccia per amministratori

**Livello di sviluppo:** 🟡 **BASILARE** (40-50%)

---

### 1.4 🔌 **Composition Root** - Il Direttore d'Orchestra
**Cosa fa:** Coordina tutti i componenti del sistema e li fa lavorare insieme. È come il direttore di un'orchestra.

**Compiti principali:**
- Avvia e configura tutti i moduli
- Gestisce le connessioni tra i componenti
- Controlla lo stato di salute del sistema
- Coordina l'accesso al database e ai servizi esterni

**Input (cosa riceve):**
- Configurazioni di sistema
- Comandi di avvio/spegnimento
- Richieste di controllo stato

**Output (cosa produce):**
- Sistema completamente configurato e funzionante
- Report di salute dei servizi
- Gestione del ciclo di vita dell'applicazione

**Livello di sviluppo:** 🟢 **COMPLETO** (90%)

---

## 2. MODULI DI SUPPORTO

### 2.1 📋 **Contracts** - Le Regole di Comunicazione
**Cosa fa:** Definisce come i dati devono essere strutturati quando viaggiano tra i diversi componenti.

**Stato attuale:** 🔴 **MINIMALE** - Solo struttura base creata

### 2.2 🧪 **Tests** - Il Sistema di Controllo Qualità
**Cosa fa:** Verifica automaticamente che tutto funzioni correttamente dopo ogni modifica.

**Stato attuale:** 🔴 **MOLTO INCOMPLETO** - Solo test basici presenti

---

## 3. COME I MODULI LAVORANO INSIEME

### Flusso tipico di creazione articolo:
1. **Utente** inserisce richiesta tramite **App Router**
2. **App Router** chiama **Composition Root**
3. **Composition Root** attiva **Content Module**
4. **Content Module** usa **Shared Module** per gestire l'operazione
5. **Content Module** chiama l'AI esterna (Perplexity)
6. **Content Module** salva l'articolo nel database
7. **App Router** mostra il risultato all'utente

---

## 4. VALUTAZIONE RISCHI NELLE MODIFICHE

### 🔴 **RISCHIO ALTO** - Toccare questi moduli può bloccare tutto:

**Shared Module:**
- Se si rompe, tutto il sistema smette di funzionare
- È come rompere le fondamenta di una casa

**Content Module (parte core):**
- Se si rompe la logica di creazione articoli, il sistema perde la sua funzione principale
- È come rompere il motore di un'auto

### 🟡 **RISCHIO MEDIO** - Modifiche che possono causare problemi:

**Composition Root:**
- Problemi nell'avvio del sistema
- Componenti che non comunicano tra loro

**Content Module (parte tecnica):**
- Problemi nel salvare/recuperare articoli
- Problemi nella comunicazione con l'AI

### 🟢 **RISCHIO BASSO** - Modifiche sicure:

**App Router:**
- Cambiare l'aspetto delle pagine
- Aggiungere nuove pagine
- Modificare testi e layout

---

## 5. PRIORITÀ DI SVILUPPO

### Cosa completare per primo:
1. **Sistema di Test** - Per garantire qualità
2. **Regole di Validazione** - Per controllare i dati in ingresso
3. **Interfaccia Utente** - Per rendere il sistema usabile
4. **Nuove Funzionalità** - Autenticazione, gestione fonti, pubblicazione automatica

### Raccomandazioni per modifiche sicure:
- Testare sempre in ambiente di sviluppo prima
- Fare piccole modifiche incrementali
- Tenere backup prima di modifiche importanti
- Documentare ogni cambiamento significativo

---

## 6. INFORMAZIONI TECNICHE RAPIDE

**Architettura:** Clean Architecture con Domain-Driven Design
**Linguaggio:** TypeScript (Next.js 15)
**Totale righe di codice:** ~10.000 linee
**File principali:** 43 file TypeScript/TSX
**Database:** PostgreSQL via Prisma ORM
**AI Provider:** Perplexity API

**Data creazione documento:** 20 Settembre 2025
**Versione:** 001
**Autore:** Analisi automatica del codice