# Test del Sistema Categorie - AutoGeorge

## 🎯 **Modifiche Implementate**

### ✅ **1. Utility Helper per Categorie**
- **File**: `src/shared/utils/categoryUtils.ts`
- **Funzioni**:
  - `determineArticleCategories()` - Determina categorie con priorità
  - `getCategorySource()` - Indica la fonte delle categorie (per logging)
  - `isValidCategory()` - Validazione categoria

### ✅ **2. Aggiornamento Sistema Auto-Publishing**
- **File**: `src/app/api/cron/auto-publishing/route.ts`
- **Modifica**: Usa la logica di priorità Source > WordPress Site > Vuoto

### ✅ **3. Aggiornamento Generazione Manuale**
- **File**: `src/app/api/admin/generate-article-manually/route.ts`
- **Modifica**: Usa la logica di priorità Source > WordPress Site > Vuoto

### ✅ **4. Aggiornamento Dashboard Articoli**
- **File**: `src/app/admin/articles/page.tsx`
- **Modifica**: Usa la logica di priorità Source > WordPress Site > Vuoto

### ✅ **5. Aggiornamento API Articoli**
- **File**: `src/app/api/admin/articles/[id]/route.ts`
- **Modifica**: Include `defaultCategory` della source nella risposta

## 🧪 **Test Manuali da Eseguire**

### **Test 1: Source con Categoria Predefinita**
1. Creare una source RSS con `defaultCategory: "Tecnologia"`
2. WordPress Site con `defaultCategory: "News"`
3. **Aspettativa**: Articoli pubblicati in categoria "Tecnologia" (priorità source)

### **Test 2: Source senza Categoria**
1. Creare una source RSS senza `defaultCategory`
2. WordPress Site con `defaultCategory: "News"`
3. **Aspettativa**: Articoli pubblicati in categoria "News" (fallback WordPress)

### **Test 3: Entrambi senza Categoria**
1. Source senza `defaultCategory`
2. WordPress Site senza `defaultCategory`
3. **Aspettativa**: Articoli pubblicati senza categoria (array vuoto)

### **Test 4: Logging delle Categorie**
1. Verificare nei log console:
   - `📂 [CategoryLogic] Using categories from source (Tecnologia): ["Tecnologia"]`
   - `📂 [AutoPublish-CategoryLogic] Article xyz using categories from wordpress-site (News): ["News"]`
   - `📂 [ManualPublish-CategoryLogic] Article xyz using categories from none: []`

## 🔧 **Debugging e Verifica**

### **1. Controllare Database**
```sql
-- Verifica sources con defaultCategory
SELECT id, name, type, "defaultCategory" FROM sources;

-- Verifica WordPress sites con defaultCategory
SELECT id, name, "defaultCategory" FROM wordpress_sites;
```

### **2. Test API Endpoints**
```bash
# Test generazione manuale
curl -X POST https://autogeorge.vercel.app/api/admin/generate-article-manually \
  -H "Content-Type: application/json" \
  -d '{"feedItemId": "TEST_ID"}'

# Test auto-publishing
curl https://autogeorge.vercel.app/api/cron/auto-publishing

# Test get article con source
curl https://autogeorge.vercel.app/api/admin/articles/{ARTICLE_ID}
```

### **3. Verifica Frontend**
- Aprire dashboard articoli: `/admin/articles`
- Pubblicare un articolo manualmente
- Verificare che la console mostri i log delle categorie

## 📊 **Scenari di Priorità**

| Source Category | WordPress Category | Risultato | Fonte |
|---|---|---|---|
| "Tech" | "News" | ["Tech"] | source |
| null | "News" | ["News"] | wordpress-site |
| "" | "News" | ["News"] | wordpress-site |
| "Tech" | null | ["Tech"] | source |
| null | null | [] | none |
| "" | "" | [] | none |

## 🚨 **Cosa Controllare**

### **Logs di Sistema**
- Auto-publishing: `📂 [AutoPublish-CategoryLogic]`
- Generazione manuale: `📂 [CategoryLogic]`
- Pubblicazione manuale: `📂 [ManualPublish-CategoryLogic]`

### **WordPress**
- Verificare che gli articoli appaiano nelle categorie corrette
- Controllare che le categorie vengano create se non esistono

### **Database**
- Campo `categories` negli articoli WordPress dovrebbe riflettere la logica
- Non dovrebbero esserci più articoli solo nella categoria predefinita

## ✅ **Criteri di Successo**

1. **Priorità Source**: Articoli da sources con categoria vanno in quella categoria
2. **Fallback WordPress**: Articoli da sources senza categoria usano la categoria del sito
3. **Nessuna Categoria**: Se niente è configurato, array vuoto (WordPress gestisce)
4. **Logging Completo**: Ogni pubblicazione logga la fonte delle categorie
5. **Retrocompatibilità**: Sistema esistente continua a funzionare

## 🔄 **Rollback Plan**

Se ci sono problemi, rimuovere questi import:
```typescript
import { determineArticleCategories, getCategorySource } from '@/shared/utils/categoryUtils';
```

E ripristinare la logica precedente:
```typescript
categories: wordpressSite.defaultCategory ? [wordpressSite.defaultCategory] : []
```