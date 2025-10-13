# 📧 AutoGeorge - Setup Email Notifications

## 🎯 Sistema Email Implementato

Il sistema di notifiche email di AutoGeorge è strutturato per fornire **informazioni utili senza spam**:

### **📊 Email Summary ogni 12 ore**
- Report completo stato piattaforma
- Uptime, performance, alert summary
- Grafici HTML e metriche dettagliate
- **CRON:** Ogni 12 ore (0 */12 * * *)

### **🚨 Email Alert per Problemi Critici**
- Solo per alert **CRITICAL** e **HIGH**
- Database down, API offline, sistema malfunzionante
- Email immediata quando problema si presenta
- Email di conferma quando problema si risolve

### **💾 Database Logging Completo**
- Tutti gli health check salvati in database
- Report storici per analisi trend
- Alert tracking con timestamps completi

---

## ⚙️ Configurazione Setup

### **1. Variabili Ambiente Vercel**

Vai su **Vercel Dashboard → Settings → Environment Variables** e aggiungi:

```bash
# Email Notifications
EMAIL_NOTIFICATIONS_ENABLED=true
EMAIL_RECIPIENTS=tuo@email.com,admin@azienda.com

# Optional: SMTP Custom (se non usi servizi esterni)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=autogeorge@tuodominio.com
SMTP_PASSWORD=password_app_specifica
```

### **2. Setup CRON Jobs**

Su **https://cron-job.org** configura DUE job:

#### **Job 1: Monitoring Continuo** (Esistente)
```
Title: AutoGeorge Health Monitor
URL: https://autogeorge.vercel.app/api/cron/monitoring
Schedule: */5 * * * * (ogni 5 minuti)
```

#### **Job 2: Email Report** (NUOVO)
```
Title: AutoGeorge Health Report Email
URL: https://autogeorge.vercel.app/api/cron/health-report
Schedule: 0 */12 * * * (ogni 12 ore: 00:00 e 12:00)
```

---

## 📧 Servizi Email Supportati

### **Opzione A: Email Service Esterno (Raccomandato)**

**Resend.com** (servizio email API semplice):
```bash
RESEND_API_KEY=your_api_key
EMAIL_FROM=noreply@tuodominio.com
```

**SendGrid**:
```bash
SENDGRID_API_KEY=your_api_key
EMAIL_FROM=noreply@tuodominio.com
```

### **Opzione B: SMTP Diretto**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=autogeorge@gmail.com
SMTP_PASSWORD=your_app_password
```

### **Opzione C: Gmail App Password**
1. Vai su **Google Account → Security → 2-Step Verification**
2. **App passwords** → Genera password per "AutoGeorge"
3. Usa quella password nelle env vars:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASSWORD=generated_app_password
```

---

## 🎨 Esempi Email Generate

### **📊 Email Summary (12 ore)**
```html
🟢 AutoGeorge Health Report

Sistema: HEALTHY | Periodo: 14/10/2024 00:00 - 14/10/2024 12:00

┌─────────────────────────────────────┐
│  Uptime: 99.2%    │  Controlli: 144  │
│  Response: 234ms  │  Alert: 2        │
└─────────────────────────────────────┘

Stato Servizi:
✅ database (healthy, 156ms)
✅ core-data (healthy, 89ms)
⚠️ rss-sources (degraded, 234ms)
✅ system-resources (healthy, 12ms)

Alert Recenti: 0 critici, 1 alti, 2 risolti
Tendenza: stable
```

### **🚨 Email Alert Critico**
```html
🚨 ALERT: Database Service Down

⚠️ Sistema AutoGeorge ha rilevato: Database connection failed - system is offline

Service: database
Severity: CRITICAL
Time: 14/10/2024 14:30:22

Istruzioni: Controlla i log su Vercel o usa gli script di rollback se necessario
Dashboard: https://autogeorge.vercel.app/admin
```

---

## 🧪 Test del Sistema

### **Test Email Summary**
```bash
# Testa manualmente il report endpoint
curl https://autogeorge.vercel.app/api/cron/health-report

# Dovrebbe rispondere con:
{
  "success": true,
  "report": {
    "overallStatus": "degraded",
    "uptime": "94%",
    "totalAlerts": 3,
    "emailSent": true/false
  }
}
```

### **Test Email Alert**
```bash
# Gli alert vengono inviati automaticamente dal monitoring
# Puoi verificare nei log Vercel se vedi:
# "📧 Critical alert email sent: 1/1 channels"
```

### **Test Database Logging**
```bash
# Verifica che i report vengano salvati
curl https://autogeorge.vercel.app/api/admin/monitoring/dashboard

# Dovrebbe mostrare health reports recenti
```

---

## 🔧 Troubleshooting

### **Email non arrivano**

1. **Verifica configurazione:**
```bash
# Controlla env vars su Vercel Dashboard
EMAIL_NOTIFICATIONS_ENABLED=true ✅
EMAIL_RECIPIENTS=email@domain.com ✅
```

2. **Check logs Vercel:**
```bash
# Cerca nei logs:
"📧 Email report sent: true"
"📧 Critical alert email sent: 1/1 channels"
```

3. **Test servizio email:**
```bash
# Se usi Gmail, verifica App Password sia corretto
# Se usi servizi esterni, controlla API key
```

### **CRON Job non funziona**

1. **Verifica setup cron-job.org:**
- URL corretto: `/api/cron/health-report`
- Schedule: `0 */12 * * *`
- Method: GET

2. **Test manuale endpoint:**
```bash
curl https://autogeorge.vercel.app/api/cron/health-report
# Deve restituire success: true
```

### **Database errors**

```bash
# Se ci sono errori Prisma, aggiorna schema:
npx prisma db push

# Verifica nuovi modelli:
# - HealthReport
# - Campi aggiuntivi in SystemAlert
```

---

## 📊 Monitoring dei Report

### **Database Query Report**
```sql
-- Vedi tutti i report generati
SELECT timestamp, reportType, overallStatus, emailSent
FROM health_reports
ORDER BY timestamp DESC;

-- Alert critici recenti
SELECT triggeredAt, severity, service, title, status
FROM system_alerts
WHERE severity IN ('critical', 'high')
ORDER BY triggeredAt DESC;
```

### **Dashboard Admin**
- **URL**: https://autogeorge.vercel.app/api/admin/monitoring/dashboard
- Mostra metriche real-time e report storici
- Uptime percentages e trend analysis

---

## 📈 Ottimizzazioni Future

### **Personalizzazione Email**
- Template HTML customizzabili
- Logo aziendale nei report
- Colori e branding personalizzati

### **Filtri Alert**
- Business hours only notifications
- Weekend vs weekday different thresholds
- Service-specific escalation paths

### **Report Avanzati**
- Weekly summary reports
- Monthly uptime analysis
- Performance regression detection

---

## ✅ Checklist Setup Completo

- [ ] **Environment Variables** configurate su Vercel
- [ ] **CRON Job 1** (monitoring) funzionante ogni 5 min
- [ ] **CRON Job 2** (report) configurato ogni 12 ore
- [ ] **Servizio Email** configurato (Gmail/Resend/SendGrid)
- [ ] **Test manuale** endpoint `/api/cron/health-report`
- [ ] **Prima email summary** ricevuta e verificata
- [ ] **Database logging** funzionante
- [ ] **Alert email** testato (se possibile)

---

**🎉 Una volta completato setup, riceverai:**
- **Email summary** ogni 12 ore con stato completo piattaforma
- **Email alert** immediate solo per problemi critici/alti
- **Database completo** di tutti i report per analisi storiche

**Sistema progettato per essere informativo ma non invasivo!** 📧✨