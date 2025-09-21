# 🚨 FIX DEPLOY IMMEDIATO

## PROBLEMA IDENTIFICATO:
- Database configurato per SQLite locale
- Vercel non supporta SQLite
- Schema Prisma per PostgreSQL ma DATABASE_URL sbagliata

## SOLUZIONE IMMEDIATA:

### 1. CREA DATABASE POSTGRESQL (GRATIS)

**OPZIONE A - Neon.tech (CONSIGLIATO):**
```bash
# 1. Vai su https://neon.tech
# 2. Registrati con GitHub
# 3. Crea nuovo database "autogeorge"
# 4. Copia connection string tipo:
# postgresql://username:password@ep-cool-name-123456.eu-central-1.aws.neon.tech/autogeorge?sslmode=require
```

**OPZIONE B - Supabase:**
```bash
# 1. Vai su https://supabase.com
# 2. Registrati con GitHub
# 3. Crea nuovo progetto "autogeorge"
# 4. Settings > Database > Connection string
```

### 2. CONFIGURA VERCEL (DAL DASHBOARD)

Vai su Vercel Dashboard > autogeorge > Settings > Environment Variables

```bash
# VARIABILI OBBLIGATORIE:
DATABASE_URL=postgresql://il-tuo-database-url
DIRECT_URL=postgresql://il-tuo-database-url
NEXTAUTH_SECRET=genera-segreto-32-caratteri
NEXTAUTH_URL=https://autogeorge.vercel.app
PERPLEXITY_API_KEY=la-tua-api-key
JWT_SECRET=altro-segreto-32-caratteri
ENCRYPTION_KEY=altro-segreto-32-caratteri
NODE_ENV=production
```

### 3. GENERA SEGRETI

```bash
# ESEGUI QUESTI COMANDI per generare segreti sicuri:
openssl rand -base64 32  # per NEXTAUTH_SECRET
openssl rand -base64 32  # per JWT_SECRET
openssl rand -base64 32  # per ENCRYPTION_KEY
```

### 4. RIDEPLOY

Dopo aver configurato le variabili su Vercel:
```bash
# Pusha qualsiasi commit o rideploy dal dashboard
git add .
git commit -m "Fix database configuration"
git push origin main
```

### 5. VERIFICA

```bash
# Una volta deployato, testa:
curl https://autogeorge.vercel.app/api/health
```

## PERCHÉ NON FUNZIONAVA:
- SQLite file:./dev.db non esiste su Vercel
- PostgreSQL schema ma SQLite URL
- Variabili ambiente mancanti su Vercel

## STATO ATTUALE:
✅ Schema Prisma corretto
✅ Guide step-by-step pronte
⏳ Attesa configurazione database cloud
⏳ Attesa configurazione variabili Vercel