# 🕐 CONFIGURAZIONE CRON - cron-job.org

## ⚠️ IMPORTANTE: CRON ESTERNO, NON VERCEL

**AutoGeorge usa cron-job.org per il polling automatico delle sources, NON Vercel Cron Jobs!**

## 🔧 Setup su cron-job.org

### URL Endpoint da configurare:
```
GET https://autogeorge.vercel.app/api/cron/poll-feeds
```

### Frequenza consigliata:
```
Ogni 15 minuti: */15 * * * *
```

### Headers da aggiungere:
```
User-Agent: cron-job.org AutoGeorge RSS Polling
Accept: application/json
```

## 🎯 Cosa fa il cron job:

1. **Polling RSS feeds**: Controlla tutti i feed RSS attivi
2. **Fetch nuovi contenuti**: Scarica articoli pubblicati di recente
3. **Auto-generazione**: Se abilitata, genera automaticamente articoli
4. **Logging**: Registra statistiche e errori

## ✅ Test manuale:

```bash
# Test del cron endpoint
curl -X GET "https://autogeorge.vercel.app/api/cron/poll-feeds"

# Dovrebbe restituire:
{
  "success": true,
  "timestamp": "2025-09-25T22:XX:XX.xxxZ",
  "results": {
    "totalSources": 3,
    "successfulPolls": 3,
    "newItemsFound": X,
    "generatedArticles": X
  }
}
```

## 🚨 REGOLE PER CLAUDE:

1. **MAI aggiungere crons a vercel.json** - usano cron-job.org esterno
2. **Endpoint `/api/cron/poll-feeds` deve rimanere pubblico** - no auth per permettere cron esterno
3. **Test sempre manualmente** dopo modifiche al polling
4. **Verificare logs** per debug problemi di fetching

## 📊 Monitoring:

- Controllare dashboard cron-job.org per execution history
- Logs disponibili nei Vercel Function Logs
- Test manuale via curl per debugging immediato