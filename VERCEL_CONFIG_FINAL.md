# 🚀 CONFIGURAZIONE VERCEL DEFINITIVA

## VARIABILI AMBIENTE DA AGGIUNGERE SU VERCEL

**Dashboard Vercel > autogeorge > Settings > Environment Variables**

### ✅ VARIABILI OBBLIGATORIE:

```bash
# DATABASE (Supabase)
DATABASE_URL=postgresql://postgres:87a6JKx1oOHGdvvr@db.weoidzvghhvtfeelctxi.supabase.co:5432/postgres

# AUTENTICAZIONE (segreti generati)
NEXTAUTH_SECRET=iQgyZwOhsLqX/NjrLmy5J5WRXsRDfRRrBPtXmDENJKM=
NEXTAUTH_URL=https://autogeorge.vercel.app
JWT_SECRET=6HqSUbvmUW7ducCJqR+7UFvlX/2tF8+ojelfesr0rqY=
ENCRYPTION_KEY=VNb++EqoJt4+iQgrUfwS1HXd/KvmCsITYn2V6E+oRyw=

# PRODUZIONE
NODE_ENV=production
```

### 🔧 VARIABILI OPZIONALI (se hai le API keys):

```bash
# AI SERVICE (se hai Perplexity)
PERPLEXITY_API_KEY=pplx-your-api-key-here

# OAUTH (se vuoi login social)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 📋 CHECKLIST DEPLOY:

1. ✅ **Aggiungi le variabili sopra su Vercel**
2. ✅ **Committa e pusha** (o rideploy dal dashboard)
3. ✅ **Testa**: `curl https://autogeorge.vercel.app/api/health`
4. ✅ **Verifica database**: Le tabelle si creeranno automaticamente al primo accesso

## 🎯 DOPO IL DEPLOY:

Testa questi endpoint:
- `https://autogeorge.vercel.app` - Homepage
- `https://autogeorge.vercel.app/api/health` - Health check
- `https://autogeorge.vercel.app/api/admin/sources` - API sources

**IL DATABASE SI INIZIALIZZERÀ AUTOMATICAMENTE** al primo deploy!