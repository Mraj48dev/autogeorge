'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Badge } from "@/shared/components/ui/badge";
import { Upload, X, Plus, Trash2, Save, Send, Eye, Calendar, Globe, Tag, Folder, Image, Settings, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { DatePicker } from "@/shared/components/ui/date-picker";

// Interfacce per i dati WordPress
interface WordPressSite {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
}

interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
}

interface WordPressTag {
  id: number;
  name: string;
  slug: string;
}

interface WordPressUser {
  id: number;
  name: string;
  slug: string;
}

interface WordPressMedia {
  id: number;
  title: string;
  url: string;
  alt_text: string;
  caption: string;
  media_type: string;
  mime_type: string;
}

interface WordPressPostFormat {
  slug: string;
  name: string;
}

interface CustomField {
  key: string;
  value: string;
}

interface WordPressPostData {
  // Dati dell'Articolo
  title: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'publish' | 'private' | 'future';
  date: string;
  slug: string;
  author: number;
  password: string;
  format: string;

  // Tassonomie
  categories: number[];
  tags: number[];

  // Immagine in Evidenza
  featured_media: number;

  // Custom Fields e Meta
  meta: Record<string, any>;

  // Controllo Avanzato
  comment_status: 'open' | 'closed';
  ping_status: 'open' | 'closed';
  sticky: boolean;
  template: string;
}

export default function PublishingPage() {
  // Stati per i dati del form
  const [postData, setPostData] = useState<WordPressPostData>({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft',
    date: new Date().toISOString(),
    slug: '',
    author: 1,
    password: '',
    format: 'standard',
    categories: [],
    tags: [],
    featured_media: 0,
    meta: {},
    comment_status: 'open',
    ping_status: 'open',
    sticky: false,
    template: ''
  });

  // Stati per i dati dal database
  const [sites, setSites] = useState<WordPressSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [categories, setCategories] = useState<WordPressCategory[]>([]);
  const [tags, setTags] = useState<WordPressTag[]>([]);
  const [users, setUsers] = useState<WordPressUser[]>([]);
  const [postFormats, setPostFormats] = useState<WordPressPostFormat[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<WordPressMedia[]>([]);

  // Stati per custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  // Stati per il caricamento immagini
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaMetadata, setMediaMetadata] = useState({
    title: '',
    alt_text: '',
    caption: '',
    description: ''
  });

  // Stati UI
  const [isLoading, setIsLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carica i siti dal database
  useEffect(() => {
    loadSites();
  }, []);

  // Carica dati WordPress quando viene selezionato un sito
  useEffect(() => {
    if (selectedSite) {
      loadWordPressData(selectedSite);
    }
  }, [selectedSite]);

  const loadSites = async () => {
    try {
      // Carica i siti configurati dalle impostazioni
      const response = await fetch('/api/admin/sites');
      if (response.ok) {
        const data = await response.json();
        const sitesData = data.sites || [];
        setSites(sitesData);

        // Auto-seleziona il primo sito se ce n'è uno solo
        if (sitesData.length === 1) {
          setSelectedSite(sitesData[0].id);
        }
      }
    } catch (error) {
      console.error('Errore caricamento siti:', error);
    }
  };

  const loadWordPressData = async (siteId: string) => {
    setIsLoading(true);
    try {
      // Carica categorie, tag, utenti e formati post da WordPress API
      const [categoriesRes, tagsRes, usersRes, formatsRes] = await Promise.all([
        fetch(`/api/admin/wordpress/${siteId}/categories`),
        fetch(`/api/admin/wordpress/${siteId}/tags`),
        fetch(`/api/admin/wordpress/${siteId}/users`),
        fetch(`/api/admin/wordpress/${siteId}/post-formats`)
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories || []);
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(tagsData.tags || []);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      if (formatsRes.ok) {
        const formatsData = await formatsRes.json();
        setPostFormats(formatsData.formats || []);
      }
    } catch (error) {
      console.error('Errore caricamento dati WordPress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const uploadMediaWithMetadata = async () => {
    if (!selectedSite || selectedFiles.length === 0) return;

    setUploadingMedia(true);
    try {
      const uploaded: WordPressMedia[] = [];

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        // Usa i metadati dal form o defaults intelligenti
        formData.append('title', mediaMetadata.title || file.name.replace(/\.[^/.]+$/, ''));
        formData.append('alt_text', mediaMetadata.alt_text || '');
        formData.append('caption', mediaMetadata.caption || '');
        formData.append('description', mediaMetadata.description || '');

        const response = await fetch(`/api/admin/wordpress/${selectedSite}/media`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const mediaData = await response.json();
          uploaded.push(mediaData.media);

          // Auto-seleziona la prima immagine come featured media se non ce n'è una
          if (uploaded.length === 1 && postData.featured_media === 0) {
            setPostData({ ...postData, featured_media: mediaData.media.id });
          }
        }
      }

      setUploadedMedia(prev => [...prev, ...uploaded]);
      setSelectedFiles([]);
      setMediaMetadata({ title: '', alt_text: '', caption: '', description: '' }); // Reset form
      setMessage({
        type: 'success',
        text: `${uploaded.length} file caricati con successo. ${uploaded.length > 0 && postData.featured_media === uploaded[0].id ? 'Impostato come immagine in evidenza.' : ''}`
      });
    } catch (error) {
      console.error('Errore upload media:', error);
      setMessage({ type: 'error', text: 'Errore durante il caricamento dei file' });
    } finally {
      setUploadingMedia(false);
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const updateCustomField = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);

    // Aggiorna anche postData.meta
    const meta = { ...postData.meta };
    if (field === 'key' && customFields[index].key) {
      delete meta[customFields[index].key];
    }
    if (updated[index].key && updated[index].value) {
      meta[updated[index].key] = updated[index].value;
    }
    setPostData({ ...postData, meta });
  };

  const removeCustomField = (index: number) => {
    const fieldToRemove = customFields[index];
    const updated = customFields.filter((_, i) => i !== index);
    setCustomFields(updated);

    // Rimuovi dal meta
    const meta = { ...postData.meta };
    if (fieldToRemove.key) {
      delete meta[fieldToRemove.key];
    }
    setPostData({ ...postData, meta });
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const publishArticle = async () => {
    if (!selectedSite) {
      setMessage({ type: 'error', text: 'Nessun sito WordPress configurato. Configura un sito nelle Impostazioni.' });
      return;
    }

    if (!postData.title || !postData.content) {
      setMessage({ type: 'error', text: 'Titolo e contenuto sono obbligatori' });
      return;
    }

    setPublishLoading(true);
    try {
      const response = await fetch(`/api/admin/wordpress/${selectedSite}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...postData,
          slug: postData.slug || generateSlug(postData.title)
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({
          type: 'success',
          text: `Articolo ${postData.status === 'publish' ? 'pubblicato' : 'salvato'} con successo! ID: ${result.post.id}`
        });

        // Reset form
        setPostData({
          title: '',
          content: '',
          excerpt: '',
          status: 'draft',
          date: new Date().toISOString(),
          slug: '',
          author: 1,
          password: '',
          format: 'standard',
          categories: [],
          tags: [],
          featured_media: 0,
          meta: {},
          comment_status: 'open',
          ping_status: 'open',
          sticky: false,
          template: ''
        });
        setCustomFields([]);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Errore durante la pubblicazione' });
      }
    } catch (error) {
      console.error('Errore pubblicazione:', error);
      setMessage({ type: 'error', text: 'Errore di rete durante la pubblicazione' });
    } finally {
      setPublishLoading(false);
    }
  };

  // Trova il sito selezionato
  const currentSite = sites.find(site => site.id === selectedSite);
  const pageTitle = currentSite ? `Pubblicazione ${currentSite.name}` : 'Pubblicazione WordPress';

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{pageTitle}</h1>
        <p className="text-muted-foreground">
          {currentSite
            ? `Pubblica articoli su ${currentSite.name} (${currentSite.url})`
            : 'Crea e pubblica articoli completi con tutti i campi WordPress disponibili'
          }
        </p>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
          <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Colonna principale - Form contenuto */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selezione Sito - Solo se ci sono più siti */}
          {sites.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Sito di Destinazione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un sito WordPress configurato" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name} ({site.url})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Messaggio se nessun sito configurato */}
          {sites.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Configurazione Richiesta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">
                    Nessun sito WordPress configurato. Vai nelle Impostazioni per configurare un sito.
                  </p>
                  <Button variant="outline" onClick={() => window.location.href = '/admin/settings'}>
                    Vai alle Impostazioni
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dati Principali Articolo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contenuto Articolo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Titolo *</Label>
                <Input
                  id="title"
                  value={postData.title}
                  onChange={(e) => setPostData({ ...postData, title: e.target.value })}
                  placeholder="Inserisci il titolo dell'articolo"
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug/URL</Label>
                <Input
                  id="slug"
                  value={postData.slug}
                  onChange={(e) => setPostData({ ...postData, slug: e.target.value })}
                  placeholder={postData.title ? generateSlug(postData.title) : "slug-articolo"}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Lascia vuoto per generarlo automaticamente dal titolo
                </p>
              </div>

              <div>
                <Label htmlFor="content">Contenuto HTML *</Label>
                <Textarea
                  id="content"
                  value={postData.content}
                  onChange={(e) => setPostData({ ...postData, content: e.target.value })}
                  placeholder="<p>Inserisci il contenuto HTML dell'articolo...</p>"
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Estratto</Label>
                <Textarea
                  id="excerpt"
                  value={postData.excerpt}
                  onChange={(e) => setPostData({ ...postData, excerpt: e.target.value })}
                  placeholder="Breve descrizione dell'articolo (opzionale)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Immagine in Evidenza */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Immagine in Evidenza
              </CardTitle>
              <CardDescription>
                Carica un'immagine e associala come featured media
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Carica Nuova</TabsTrigger>
                  <TabsTrigger value="existing">Usa Esistente</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <div>
                    <Label htmlFor="media-upload">Seleziona File</Label>
                    <Input
                      id="media-upload"
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                      onChange={handleFileSelect}
                    />
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-4">
                      <Label>File Selezionati:</Label>
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{file.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      {/* Metadati Immagine */}
                      <div className="space-y-3 border-t pt-4">
                        <Label className="text-sm font-medium">Metadati Immagine (applicati a tutti i file)</Label>

                        <div>
                          <Label htmlFor="media-title">Titolo</Label>
                          <Input
                            id="media-title"
                            value={mediaMetadata.title}
                            onChange={(e) => setMediaMetadata({ ...mediaMetadata, title: e.target.value })}
                            placeholder="Titolo dell'immagine (opzionale)"
                          />
                        </div>

                        <div>
                          <Label htmlFor="media-alt">Testo Alternativo (ALT) *</Label>
                          <Input
                            id="media-alt"
                            value={mediaMetadata.alt_text}
                            onChange={(e) => setMediaMetadata({ ...mediaMetadata, alt_text: e.target.value })}
                            placeholder="Descrizione per accessibilità e SEO"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Importante per SEO e accessibilità
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="media-caption">Didascalia</Label>
                          <Input
                            id="media-caption"
                            value={mediaMetadata.caption}
                            onChange={(e) => setMediaMetadata({ ...mediaMetadata, caption: e.target.value })}
                            placeholder="Didascalia visibile sotto l'immagine"
                          />
                        </div>

                        <div>
                          <Label htmlFor="media-description">Descrizione</Label>
                          <Textarea
                            id="media-description"
                            value={mediaMetadata.description}
                            onChange={(e) => setMediaMetadata({ ...mediaMetadata, description: e.target.value })}
                            placeholder="Descrizione dettagliata dell'immagine"
                            rows={2}
                          />
                        </div>
                      </div>

                      <Button
                        onClick={uploadMediaWithMetadata}
                        disabled={uploadingMedia || !selectedSite}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingMedia ? 'Caricamento...' : 'Carica File con Metadati'}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="existing">
                  <Select
                    value={postData.featured_media.toString()}
                    onValueChange={(value) => setPostData({ ...postData, featured_media: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona immagine esistente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Nessuna immagine</SelectItem>
                      {uploadedMedia.map((media) => (
                        <SelectItem key={media.id} value={media.id.toString()}>
                          {media.title} ({media.media_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Custom Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Custom Fields
              </CardTitle>
              <CardDescription>
                Aggiungi meta fields personalizzati per ACF, Yoast SEO, etc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customFields.map((field, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Nome campo"
                      value={field.key}
                      onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                    />
                    <Input
                      placeholder="Valore"
                      value={field.value}
                      onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCustomField(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={addCustomField}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Custom Field
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Opzioni pubblicazione */}
        <div className="space-y-6">
          {/* Stato e Pubblicazione */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Pubblicazione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Stato</Label>
                <Select
                  value={postData.status}
                  onValueChange={(value: any) => setPostData({ ...postData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Bozza</SelectItem>
                    <SelectItem value="publish">Pubblicato</SelectItem>
                    <SelectItem value="private">Privato</SelectItem>
                    <SelectItem value="future">Programmato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Data Pubblicazione</Label>
                <DatePicker
                  date={new Date(postData.date)}
                  setDate={(date) => setPostData({ ...postData, date: date?.toISOString() || new Date().toISOString() })}
                />
              </div>

              <div>
                <Label htmlFor="author">Autore</Label>
                <Select
                  value={postData.author.toString()}
                  onValueChange={(value) => setPostData({ ...postData, author: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="password">Password (contenuto protetto)</Label>
                <Input
                  id="password"
                  type="password"
                  value={postData.password}
                  onChange={(e) => setPostData({ ...postData, password: e.target.value })}
                  placeholder="Lascia vuoto per contenuto pubblico"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="sticky"
                  checked={postData.sticky}
                  onCheckedChange={(checked) => setPostData({ ...postData, sticky: checked })}
                />
                <Label htmlFor="sticky">Post in evidenza (sticky)</Label>
              </div>
            </CardContent>
          </Card>

          {/* Categorie e Tag */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" />
                Tassonomie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Categorie</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`cat-${category.id}`}
                        checked={postData.categories.includes(category.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPostData({ ...postData, categories: [...postData.categories, category.id] });
                          } else {
                            setPostData({ ...postData, categories: postData.categories.filter(id => id !== category.id) });
                          }
                        }}
                      />
                      <Label htmlFor={`cat-${category.id}`} className="text-sm">
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="mt-2">
                  <Label className="text-sm">Categorie Selezionate:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {postData.categories.map((catId) => {
                      const category = categories.find(c => c.id === catId);
                      return category ? (
                        <Badge key={catId} variant="secondary" className="text-xs">
                          {category.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>

              <div>
                <Label>Tag</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {tags.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`tag-${tag.id}`}
                        checked={postData.tags.includes(tag.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPostData({ ...postData, tags: [...postData.tags, tag.id] });
                          } else {
                            setPostData({ ...postData, tags: postData.tags.filter(id => id !== tag.id) });
                          }
                        }}
                      />
                      <Label htmlFor={`tag-${tag.id}`} className="text-sm">
                        {tag.name}
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="mt-2">
                  <Label className="text-sm">Tag Selezionati:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {postData.tags.map((tagId) => {
                      const tag = tags.find(t => t.id === tagId);
                      return tag ? (
                        <Badge key={tagId} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Opzioni Avanzate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Opzioni Avanzate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="format">Formato Post</Label>
                <Select
                  value={postData.format}
                  onValueChange={(value) => setPostData({ ...postData, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="aside">Aside</SelectItem>
                    <SelectItem value="gallery">Gallery</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    {postFormats.map((format) => (
                      <SelectItem key={format.slug} value={format.slug}>
                        {format.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="template">Template Personalizzato</Label>
                <Input
                  id="template"
                  value={postData.template}
                  onChange={(e) => setPostData({ ...postData, template: e.target.value })}
                  placeholder="es. single-custom.php"
                />
              </div>

              <div>
                <Label htmlFor="comment-status">Commenti</Label>
                <Select
                  value={postData.comment_status}
                  onValueChange={(value: any) => setPostData({ ...postData, comment_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Apri</SelectItem>
                    <SelectItem value="closed">Chiusi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ping-status">Ping/Trackback</Label>
                <Select
                  value={postData.ping_status}
                  onValueChange={(value: any) => setPostData({ ...postData, ping_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Apri</SelectItem>
                    <SelectItem value="closed">Chiusi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Pulsante Pubblica */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Button
                  onClick={() => setPostData({ ...postData, status: 'draft' })}
                  variant="outline"
                  className="w-full"
                  disabled={!selectedSite}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salva Bozza
                </Button>

                <Button
                  onClick={() => {
                    setPostData({ ...postData, status: 'publish' });
                    publishArticle();
                  }}
                  className="w-full"
                  disabled={publishLoading || !selectedSite || !postData.title || !postData.content}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {publishLoading ? 'Pubblicazione...' : 'Pubblica Articolo'}
                </Button>

                <Button
                  onClick={() => {
                    if (postData.status !== 'publish') {
                      publishArticle();
                    }
                  }}
                  variant="secondary"
                  className="w-full"
                  disabled={publishLoading || !selectedSite}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Anteprima
                </Button>
              </div>

              {!selectedSite && sites.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Configura un sito WordPress nelle Impostazioni per abilitare la pubblicazione
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}