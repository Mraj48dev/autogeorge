# AutoGeorge RSS Monitoring Setup

## Strategie per Monitoraggio Continuo (Vercel Gratuito)

### 1. GitHub Actions (RACCOMANDATO)

✅ **File creato**: `.github/workflows/rss-monitoring.yml`

**Vantaggi:**
- Completamente gratuito
- Esecuzione ogni 5 minuti
- Logs dettagliati
- Notifiche di errore

**Attivazione:**
1. Commit e push del file workflow
2. GitHub attiverà automaticamente il cron

### 2. Uptime Robot

**Setup:**
1. Vai su [uptimerobot.com](https://uptimerobot.com)
2. Crea monitor di tipo "HTTP(s)"
3. URL: `https://autogeorge.vercel.app/api/cron/poll-feeds`
4. Metodo: POST
5. Intervallo: 5 minuti

### 3. Cron-Job.org

**Setup:**
1. Vai su [cron-job.org](https://cron-job.org)
2. Registrati (gratuito)
3. URL: `https://autogeorge.vercel.app/api/cron/poll-feeds`
4. Metodo: POST
5. Esecuzione: */5 * * * * (ogni 5 minuti)

### 4. Server VPS Personale

**Comando crontab:**
```bash
*/5 * * * * curl -X POST https://autogeorge.vercel.app/api/cron/poll-feeds
```

## Monitoraggio Attuale

- ✅ Endpoint funzionante: `https://autogeorge.vercel.app/api/cron/poll-feeds`
- ✅ Database Neon collegato
- ✅ 4 fonti RSS attive
- ✅ Ultimo test: 29 articoli raccolti

## Test Manuale

```bash
curl -X POST https://autogeorge.vercel.app/api/cron/poll-feeds
```