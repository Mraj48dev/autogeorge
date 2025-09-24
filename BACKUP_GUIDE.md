# 🔧 Database Backup & Restore Guide

## ⚠️ IMPORTANTE
Sempre creare un backup PRIMA di modifiche al database schema o deployment rischiosi.

## 🚀 Metodi di Backup

### 1. Backup Manuale (Raccomandato)

```bash
# Creare backup
./scripts/backup-database.sh

# Il backup viene salvato in: backups/database/autogeorge_backup_YYYYMMDD_HHMMSS.sql.gz
```

### 2. Backup via API

```bash
# Creare backup via API
curl -X POST "https://autogeorge.vercel.app/api/admin/backup" \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}'

# Listare backup disponibili
curl -X GET "https://autogeorge.vercel.app/api/admin/backup"
```

### 3. Backup Prima di Modifiche Schema

```bash
# SEMPRE eseguire prima di modifiche al database:
./scripts/backup-database.sh
git add backups/
git commit -m "Database backup before schema changes"
```

## 🔄 Restore Database

### Restore da Backup Locale
```bash
# Listare backup disponibili
ls -la backups/database/

# Restore da backup specifico
./scripts/restore-database.sh backups/database/autogeorge_backup_20250924_160000.sql.gz
```

### Restore Manuale
```bash
# Decomprime e restore
zcat backups/database/autogeorge_backup_20250924_160000.sql.gz | psql $DATABASE_URL
```

## 📋 Best Practices

### 1. **Backup Schedule**
- ✅ Backup quotidiano automatico (se possibile)
- ✅ Backup prima di ogni deployment
- ✅ Backup prima di modifiche schema
- ✅ Backup prima di test rischiosi

### 2. **Retention Policy**
- Mantenere ultimi 10 backup locali
- Backup settimanali per 1 mese
- Backup mensili per 1 anno

### 3. **Testing Restore**
- Testare restore mensile su database di test
- Verificare integrità backup regolarmente

## 🛡️ Configurazione Neon.tech

### Point-in-Time Recovery
Neon.tech offre Point-in-Time Recovery automatico:
- Retention: 7 giorni (free tier) / 30 giorni (paid)
- Recovery granulare fino al secondo
- Accessibile via console Neon

### Branch Database
```bash
# Creare branch per testing (sicuro)
neon branches create --name=test-publishing

# Testare modifiche sul branch
DATABASE_URL="postgresql://...test-publishing..." npx prisma db push

# Se tutto ok, merge to main branch
neon branches merge test-publishing main
```

## 🚨 Emergency Recovery

### Se hai perso dati:
1. **STOP** - Non fare altre modifiche
2. Controlla backup locali: `ls backups/database/`
3. Controlla Point-in-Time Recovery su Neon console
4. Restore dal backup più recente
5. Verifica integrità dati

### Prevenzione Perdita Dati:
```bash
# Prima di QUALSIASI modifica schema:
echo "Creating safety backup..."
./scripts/backup-database.sh
echo "Backup completed. Safe to proceed."
```

## 📞 Comandi Rapidi

```bash
# Backup rapido
./scripts/backup-database.sh

# Lista backup
ls -la backups/database/

# Restore ultimo backup
./scripts/restore-database.sh $(ls -t backups/database/*.sql.gz | head -1)

# Size totale backup
du -sh backups/database/
```