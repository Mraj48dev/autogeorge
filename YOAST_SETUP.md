# 🔧 Setup Yoast SEO per AutoGeorge

Questa guida spiega come configurare WordPress e Yoast SEO per ricevere correttamente le meta description inviate da AutoGeorge via REST API.

## ⚠️ Problema

Yoast SEO non riceve automaticamente i meta fields inviati tramite REST API perché:
- Il REST API di Yoast è **read-only** (solo lettura)
- I meta fields `_yoast_wpseo_metadesc` devono essere **registrati** in WordPress
- Potrebbe servire un **save manuale** per attivare completamente Yoast

## ✅ Soluzione 1: Registrazione Meta Fields (CONSIGLIATA)

Aggiungi questo codice al file `functions.php` del tuo tema WordPress:

```php
<?php
// ✅ YOAST SEO: Registra meta fields per REST API
add_action('rest_api_init', function() {
    // Meta Description
    register_post_meta('post', '_yoast_wpseo_metadesc', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'auth_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    // SEO Title (opzionale per futuro)
    register_post_meta('post', '_yoast_wpseo_title', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'auth_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);

    // Focus Keyword (opzionale per futuro)
    register_post_meta('post', '_yoast_wpseo_focuskw', [
        'show_in_rest' => true,
        'single' => true,
        'type' => 'string',
        'auth_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);
});
?>
```

## ✅ Soluzione 2: Plugin Terze Parti

Installa il plugin **wp-api-yoast-meta** da GitHub:
```
https://github.com/ChazUK/wp-api-yoast-meta
```

Questo plugin aggiunge automaticamente i campi Yoast al REST API.

## ✅ Soluzione 3: Verifica Excerpt (ATTUALMENTE ATTIVA)

AutoGeorge invia già la meta description come **excerpt** di WordPress:
- Vai nel backend WordPress → Post → Modifica post
- Controlla che l'excerpt contenga la meta description
- Yoast dovrebbe rilevarlo automaticamente se configurato per usare l'excerpt

## 🔍 Come Verificare

1. **Dopo aver pubblicato un articolo** con AutoGeorge:
   - Vai nel backend WordPress
   - Modifica il post pubblicato
   - Controlla la sezione Yoast SEO in fondo alla pagina

2. **Controlli da fare:**
   - [ ] L'excerpt contiene la meta description
   - [ ] Yoast mostra la meta description nella preview
   - [ ] I custom fields mostrano `_yoast_wpseo_metadesc`
   - [ ] Il codice sorgente HTML contiene il meta tag

3. **Se non funziona ancora:**
   - Salva manualmente il post una volta (senza modifiche)
   - Questo attiva completamente l'analisi di Yoast

## 🎯 Campo Principale Usato da AutoGeorge

AutoGeorge invia la meta description in questi formati:

1. **WordPress Excerpt** (standard, sempre attivo)
2. **Meta Field**: `_yoast_wpseo_metadesc` (richiede registrazione)
3. **Fallback**: `yoast_wpseo_metadesc`, `_aioseop_description`

## 📞 Support

Se hai problemi:
1. Verifica che Yoast SEO sia attivo e aggiornato
2. Controlla che i meta fields siano registrati
3. Prova un save manuale del post
4. Controlla i log di WordPress per errori API

## 🔄 Test Rapido

Usa questo comando per verificare che i meta fields siano registrati:

```bash
curl -X GET "https://your-site.com/wp-json/wp/v2/posts/123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Se vedi `meta._yoast_wpseo_metadesc` nella risposta, la registrazione funziona!