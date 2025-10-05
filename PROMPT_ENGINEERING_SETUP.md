# 🧠 Prompt Engineering Setup - AutoGeorge v1.0.5

## 🚀 **Nuove Funzionalità Implementate**

AutoGeorge ora supporta **3 modalità di generazione immagini**:

### 📝 **1. Modalità Manuale**
- Comportamento originale: scrivi tu il prompt per DALL-E
- Controllo completo ma richiede esperienza con prompt engineering

### 🤝 **2. Modalità AI Assistita** ⭐ **CONSIGLIATA**
- ChatGPT analizza l'articolo e genera un prompt ottimizzato
- Puoi modificare il prompt prima della generazione
- Best of both worlds: qualità AI + controllo utente

### 🚀 **3. Modalità Completamente Automatica**
- Zero sforzo: tutto gestito dall'AI
- Ideale per automazione o quando hai fretta
- Risultati consistenti e ottimizzati

---

## ⚙️ **Setup Richiesto**

### 1. **Variabile Ambiente**
Aggiungi al tuo `.env.local`:
```bash
# OpenAI API per prompt engineering
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 2. **Database Schema Update**
Esegui:
```bash
npm run db:push
```

### 3. **Riavvia il Server**
```bash
npm run dev
```

---

## 🎯 **Come Usare**

### **Nell'Admin Panel:**

1. **Vai su Sources → [fonte] → Contents**
2. **Click "Genera Articolo"** su un feed item
3. **Seleziona la modalità** nel nuovo modal intelligente:
   - **🤝 AI Assistita**: L'AI genera un prompt che puoi modificare
   - **🚀 Automatica**: L'AI fa tutto senza intervento
   - **✏️ Manuale**: Scrivi tu il prompt (come prima)

### **Nelle Generation Settings:**

Puoi configurare:
- **Modalità predefinita** per nuovi articoli
- **Template personalizzato** per ChatGPT
- **Modello AI** da utilizzare (gpt-4, gpt-3.5-turbo)

---

## 🔧 **Architettura Tecnica**

### **Nuovo Modulo: PromptEngineer**
```
src/modules/prompt-engineer/
├── domain/
│   ├── entities/ImagePrompt.ts
│   └── value-objects/PromptText.ts
├── application/
│   └── use-cases/GenerateImagePrompt.ts
├── infrastructure/
│   ├── ChatGptPromptService.ts
│   └── PrismaImagePromptRepository.ts
└── admin/PromptEngineerFacade.ts
```

### **Nuova Tabella Database**
```sql
CREATE TABLE image_prompts (
  id               TEXT PRIMARY KEY,
  article_id       TEXT NOT NULL,
  article_title    TEXT NOT NULL,
  article_excerpt  TEXT NOT NULL,
  generated_prompt TEXT NOT NULL,
  original_template TEXT NOT NULL,
  ai_model         TEXT NOT NULL,
  status           TEXT NOT NULL,
  metadata         TEXT,
  error_message    TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);
```

### **Nuovi API Endpoints**
- `POST /api/admin/prompt/generate` - Genera prompt AI
- `POST /api/admin/prompt/validate` - Valida prompt modificato

### **Campi GenerationSettings**
```typescript
interface GenerationSettings {
  // Nuovi campi per prompt engineering
  imageGenerationMode: 'manual' | 'ai_assisted' | 'full_auto';
  enablePromptEngineering: boolean;
  promptTemplate: string;
  allowPromptEditing: boolean;
  promptEngineeringModel: 'gpt-4' | 'gpt-3.5-turbo';
}
```

---

## 🧪 **Testing**

### **Test Modalità AI Assistita:**
1. Seleziona un feed item con contenuto ricco
2. Scegli "AI Assistita"
3. Verifica che ChatGPT generi un prompt sensato
4. Modifica il prompt se necessario
5. Genera l'immagine

### **Test Modalità Automatica:**
1. Seleziona un feed item
2. Scegli "Completamente Automatica"
3. Verifica che tutto avvenga senza intervento
4. Controlla che l'immagine sia appropriata

### **Fallback Testing:**
1. Prova senza `OPENAI_API_KEY` configurata
2. Verifica che il sistema torni alla modalità manuale
3. Controlla che non ci siano errori critici

---

## 🎯 **Vantaggi della Nuova Implementazione**

### **Per gli Utenti:**
- **Riduce errori DALL-E**: Prompt AI-ottimizzati evitano restrizioni
- **Maggiore qualità**: ChatGPT sa come scrivere prompt efficaci
- **Flessibilità totale**: 3 modalità per ogni esigenza
- **Learning tool**: Impari vedendo i prompt AI-generati

### **Per il Sistema:**
- **Scalabilità**: Automazione completa per volumi alti
- **Consistenza**: Prompt standardizzati e ottimizzati
- **Debugging**: Tracciabilità completa di prompt e risultati
- **Estendibilità**: Facile aggiungere nuovi modelli AI

---

## 🚨 **Troubleshooting**

### **Errore: "OpenAI API key is required"**
- Verifica che `OPENAI_API_KEY` sia configurata in `.env.local`
- Riavvia il server dopo aver aggiunto la chiave

### **Errore: "Failed to generate prompt"**
- Controlla che la chiave API OpenAI sia valida
- Verifica che hai crediti sufficienti su OpenAI
- Prova con un articolo più breve

### **Prompt generati di bassa qualità**
- Modifica il template in Generation Settings
- Usa modalità "AI Assistita" per controllare e modificare
- Prova con il modello GPT-4 invece di GPT-3.5

### **Immagini ancora rifiutate da DALL-E**
- Il sistema riduce ma non elimina completamente i rifiuti
- Usa modalità "AI Assistita" per rivedere prompt problematici
- Considera di modificare manualmente i prompt generati

---

## 🎉 **Implementazione Completata!**

Il sistema è ora **pronto per la produzione** con:

✅ **Clean Architecture** completa
✅ **3 modalità di generazione** implementate
✅ **API endpoints** funzionanti
✅ **UI intelligente** con selezione modalità
✅ **Database schema** aggiornato
✅ **Container DI** configurato
✅ **Error handling** robusto
✅ **Backward compatibility** mantenuta

**Testalo subito e goditi la nuova esperienza di generazione immagini! 🚀**