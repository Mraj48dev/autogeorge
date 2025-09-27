

L'utente nelle impostazioni deve inserire i prompt che vuole sottoporre a perplexity per:
- titolo {title-prompt} 
- il testo {atricle-prompt}
- generazione delle immagini {image-prompt}
Il modulo source salva il contenuto della fonte nel database {fonte}.
Il modulo content prende il contenuto salvato dal modulo source {fonte} e lo fa diventare parte di questo prompt:

Compila questo JSON per un articolo su {fonte}, per il titolo utilizza queste indicazioni {title-prompt}, per il testo dell'articolo utilizza queste indicazioni {article-prompt} e per la generazione dell'immagine in evidenza una questo prompt {image-prompt}
{
  "articolo": {
    "metadati": {
      "titolo": "",
      "slug": "",
      "meta_descrizione": "",
    },
    
    "seo": {
      "keyword_principale": "",
      "meta_title": "",
      "meta_description": ""
    },
    
    "contenuto": {},
    
    "immagine_principale": {
      "comando_ai": "",
      "alt_text": "",
      "caption": "",
      "nome_file": ""
    },
    
    "link_interni": [
      {
        "anchor_text": "",
        "url": ""
      }
    ],
    

  }
}

Adegua la tabella articles per recepire tutti questi dati e aggiungi alla pagina impostazioni un campo pt ogni prompt 