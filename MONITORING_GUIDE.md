# 📊 AutoGeorge - Sistema Monitoring Completo

## 🎯 Panoramica

AutoGeorge implementa un sistema di monitoring enterprise-grade con:

- **Health Check Esteso**: Monitoraggio real-time di tutti i servizi
- **Sistema Alert Intelligente**: Alert automatici con regole configurabili
- **Notifiche Multi-Channel**: Email, Slack, Discord, Telegram
- **Dashboard Monitoring**: Visualizzazione metriche e trend
- **CRON Monitoring**: Controlli automatici ogni 5 minuti
- **Performance Analytics**: Analisi prestazioni e uptime

## 🏗️ Architettura del Sistema

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CRON Job      │    │  Health Check    │    │   Alert Rules   │
│   (5 minuti)    │───▶│   Endpoint       │───▶│   Processor     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dashboard     │    │    Database      │    │  Notification   │
│     API         │◀───│   Storage        │◀───│    Service      │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Email       │    │      Slack       │    │    Discord      │
│  Notifications  │    │   Notifications  │    │  Notifications  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Setup e Configurazione

### 1. **Configurazione Environment Variables**

Aggiungi queste variabili al tuo ambiente Vercel:

```bash
# Notifiche Email
EMAIL_NOTIFICATIONS_ENABLED=true
EMAIL_RECIPIENTS=admin@tuodominio.com,dev@tuodominio.com

# Notifiche Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#autogeorge-alerts
SLACK_USERNAME=AutoGeorge Monitor

# Notifiche Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK
DISCORD_USERNAME=AutoGeorge Monitor

# Notifiche Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 2. **Setup CRON Job Esterno**

**Vai su https://cron-job.org e configura:**

```
Title: AutoGeorge Monitoring
URL: https://autogeorge.vercel.app/api/cron/monitoring
Method: GET
Schedule: */5 * * * * (ogni 5 minuti)
Headers:
  - User-Agent: cron-job.org AutoGeorge Monitoring
  - Accept: application/json
Enable Notifications: Yes
```

### 3. **Verifica Setup**

```bash
# Test manuale del monitoring
curl https://autogeorge.vercel.app/api/health/comprehensive

# Test del sistema di alert
curl -X POST https://autogeorge.vercel.app/api/health/alerts \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Test della dashboard
curl https://autogeorge.vercel.app/api/admin/monitoring/dashboard
```

## 📊 Endpoints del Sistema

### **Health Check Endpoints**

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/health` | GET | Health check base |
| `/api/health/comprehensive` | GET | Health check completo con metriche |

### **Alert System Endpoints**

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/health/alerts` | GET | Recupera alert attivi |
| `/api/health/alerts` | POST | Processa alert da health data |

### **Monitoring Endpoints**

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/cron/monitoring` | GET | Endpoint CRON per monitoring |
| `/api/admin/monitoring/dashboard` | GET | Dashboard dati completi |

## 🚨 Sistema Alert Rules

### **Alert Rules Configurate**

1. **Database Service Down** (CRITICAL)
   - Condizione: Database connection fallita
   - Cooldown: 5 minuti

2. **API Services Degraded** (HIGH)
   - Condizione: Endpoint API non rispondono
   - Cooldown: 10 minuti

3. **RSS Feeds Failing** (MEDIUM)
   - Condizione: Errori nei feed RSS
   - Cooldown: 30 minuti

4. **Performance Degraded** (MEDIUM)
   - Condizione: Response time > 5 secondi
   - Cooldown: 15 minuti

5. **High Memory Usage** (MEDIUM)
   - Condizione: Memoria > 400MB
   - Cooldown: 20 minuti

6. **External API Down** (HIGH)
   - Condizione: Perplexity AI non risponde
   - Cooldown: 15 minuti

### **Severity Levels**

- 🟡 **LOW**: Problemi minori, non critici
- 🟠 **MEDIUM**: Problemi che impattano funzionalità
- 🔴 **HIGH**: Problemi gravi che bloccano servizi
- 🚨 **CRITICAL**: Sistema completamente offline

## 📈 Metriche Monitorate

### **System Health**
- ✅ Database connectivity
- ✅ API endpoints status
- ✅ RSS sources health
- ✅ External services (AI APIs)
- ✅ System resources (memory, performance)

### **Performance Metrics**
- ⚡ Response times
- 📊 Service uptime percentages
- 📈 Error rates
- 💾 Memory usage trends
- 🔄 Request counts

### **Business Metrics**
- 📰 Active RSS sources
- 📝 Articles generated
- 🖼️ Images created
- 📤 Publications sent
- 🚨 Alert frequency

## 📱 Notification Channels

### **Console (Sempre Attivo)**
```
🚨 [CRITICAL] Database Service Down
📋 Database connection failed - system is offline
🔧 Service: database
🕐 2024-01-15 14:30:22
```

### **Slack Integration**
```json
{
  "username": "AutoGeorge Monitor",
  "attachments": [{
    "color": "#d32f2f",
    "title": "🚨 Database Service Down",
    "text": "Database connection failed - system is offline",
    "fields": [
      {"title": "Severity", "value": "CRITICAL", "short": true},
      {"title": "Service", "value": "database", "short": true}
    ]
  }]
}
```

### **Discord Integration**
Rich embed con colori severity-specific e timestamp automatico.

### **Telegram Integration**
Messaggio formattato Markdown con emoji e info strutturate.

### **Email Integration**
HTML template professionale con dettagli completi e styling severity-based.

## 🎛️ Dashboard Monitoring

### **Metriche Visualizzate**

1. **System Status Overview**
   - Current overall status
   - Service count by status
   - Last check timestamp

2. **Active Alerts**
   - Alert count by severity
   - Recent alert history
   - Alert resolution times

3. **Performance Trends**
   - Response time trends (20 recent checks)
   - Status history (50 recent checks)
   - Service uptime percentages

4. **Service Details**
   - Individual service status
   - Response times per service
   - Error details when available

### **API Dashboard Query**
```bash
curl "https://autogeorge.vercel.app/api/admin/monitoring/dashboard?timeframe=24h&include_resolved=true"
```

## 🛠️ Troubleshooting

### **Common Issues**

1. **Alert Not Triggering**
   ```bash
   # Check health endpoint
   curl https://autogeorge.vercel.app/api/health/comprehensive

   # Manual alert test
   curl -X POST https://autogeorge.vercel.app/api/health/alerts \
     -H "Content-Type: application/json" \
     -d '{"overall": "unhealthy", "checks": [{"service": "test", "status": "unhealthy"}]}'
   ```

2. **Notifications Not Sending**
   ```bash
   # Check environment variables
   echo $SLACK_WEBHOOK_URL
   echo $EMAIL_NOTIFICATIONS_ENABLED

   # Test webhook manually
   curl -X POST $SLACK_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{"text": "Test notification"}'
   ```

3. **CRON Job Not Running**
   - Verifica configurazione su cron-job.org
   - Controlla URL endpoint corretto
   - Verifica headers configurati
   - Check execution history su cron-job.org dashboard

4. **Database Connection Issues**
   ```bash
   # Test database directly
   curl https://autogeorge.vercel.app/api/health/comprehensive | jq '.checks[] | select(.service=="database")'
   ```

5. **High Memory Alerts**
   ```bash
   # Check current memory usage
   curl https://autogeorge.vercel.app/api/health/comprehensive | jq '.checks[] | select(.service=="system-resources")'
   ```

## 📊 Logging e Debug

### **Log Levels**

- **INFO**: Status normale, operazioni completate
- **WARN**: Problemi non critici, degraded services
- **ERROR**: Errori che richiedono attenzione
- **CRITICAL**: Sistema offline o malfunzionante

### **Log Monitoring**

```bash
# Vercel dashboard logs per monitoring real-time
# Search per "🚨" per alert critici
# Search per "📬" per notification status
# Search per "🔍" per monitoring execution
```

## 🔧 Personalizzazioni

### **Aggiungere Nuove Alert Rules**

```typescript
// In /src/app/api/health/alerts/route.ts
const NEW_RULE: AlertRule = {
  type: 'custom_issue',
  service: 'custom_service',
  condition: (data) => /* your condition */,
  severity: 'high',
  title: 'Custom Alert Title',
  message: 'Custom alert message',
  cooldownMinutes: 10
};

ALERT_RULES.push(NEW_RULE);
```

### **Configurare Nuovi Notification Channels**

```typescript
// In notification-service.ts
// Aggiungi nuovi provider (Teams, PagerDuty, etc.)
```

### **Custom Health Checks**

```typescript
// In /src/app/api/health/comprehensive/route.ts
// Aggiungi nuove funzioni di check per servizi custom
async function checkCustomService(checks: HealthCheckResult[]) {
  // Implementation
}
```

## 🎯 Best Practices

1. **Alert Fatigue Prevention**
   - Usa cooldown appropriati
   - Raggruppa alert simili
   - Severity levels appropriati

2. **Performance Optimization**
   - Health check timeout configurabili
   - Parallel execution dei check
   - Database query ottimizzate

3. **Notification Management**
   - Channel diversi per severity diverse
   - Escalation policies
   - Business hours configuration

4. **Data Retention**
   - Cleanup automatico health checks vecchi
   - Archive alert risolti
   - Performance metrics aggregation

## 🔗 Links Utili

- **Dashboard Live**: https://autogeorge.vercel.app/admin/monitoring
- **Health Status**: https://autogeorge.vercel.app/api/health/comprehensive
- **CRON Job Dashboard**: https://cron-job.org/
- **Vercel Logs**: Dashboard Vercel → Functions → Logs
- **Database**: Neon.tech dashboard

---

## 📞 Support

Per problemi con il sistema di monitoring:

1. **Check dei logs** su Vercel dashboard
2. **Test manuali** degli endpoint
3. **Verifica configurazione** environment variables
4. **Alert history** nel database per pattern analysis

Il sistema è progettato per essere **resiliente** e **self-monitoring** - se il monitoring stesso ha problemi, dovrebbe alertare automaticamente! 🚀