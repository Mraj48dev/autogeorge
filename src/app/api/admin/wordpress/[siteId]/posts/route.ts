import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('per_page') || '10');

    // Recupera i dati del sito dal database
    const site = await prisma.wordPressSite.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      return NextResponse.json(
        { error: 'Sito non trovato' },
        { status: 404 }
      );
    }

    // Fetch dei post da WordPress REST API
    const wpApiUrl = `${site.url}/wp-json/wp/v2/posts?page=${page}&per_page=${perPage}`;
    const auth = Buffer.from(`${site.username}:${site.password}`).toString('base64');

    const response = await fetch(wpApiUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Errore WordPress: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const posts = await response.json();
    const totalPages = response.headers.get('X-WP-TotalPages');
    const total = response.headers.get('X-WP-Total');

    // Mappa i post nel formato necessario
    const mappedPosts = posts.map((post: any) => ({
      id: post.id,
      title: post.title?.rendered,
      content: post.content?.rendered,
      excerpt: post.excerpt?.rendered,
      status: post.status,
      date: post.date,
      modified: post.modified,
      slug: post.slug,
      link: post.link,
      author: post.author,
      categories: post.categories,
      tags: post.tags,
      featured_media: post.featured_media
    }));

    return NextResponse.json({
      success: true,
      posts: mappedPosts,
      pagination: {
        page,
        per_page: perPage,
        total: parseInt(total || '0'),
        total_pages: parseInt(totalPages || '0')
      }
    });

  } catch (error) {
    console.error('Errore nel recupero post WordPress:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = params;

    // Recupera i dati del sito dal database
    const site = await prisma.wordPressSite.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      return NextResponse.json(
        { error: 'Sito non trovato' },
        { status: 404 }
      );
    }

    // Leggi i dati del post dal body della richiesta
    const postData = await request.json();

    // Valida i dati obbligatori
    if (!postData.title || !postData.content) {
      return NextResponse.json(
        { error: 'Titolo e contenuto sono obbligatori' },
        { status: 400 }
      );
    }

    // Prepara i dati per WordPress REST API
    const wpPostData: any = {
      title: postData.title,
      content: postData.content,
      status: postData.status || 'draft'
    };

    // Campi opzionali
    if (postData.excerpt) wpPostData.excerpt = postData.excerpt;
    if (postData.slug) wpPostData.slug = postData.slug;
    if (postData.author) wpPostData.author = postData.author;
    if (postData.date) wpPostData.date = postData.date;
    if (postData.password) wpPostData.password = postData.password;
    if (postData.format) wpPostData.format = postData.format;
    if (postData.template) wpPostData.template = postData.template;

    // Tassonomie
    if (postData.categories && postData.categories.length > 0) {
      wpPostData.categories = postData.categories;
    }
    if (postData.tags && postData.tags.length > 0) {
      wpPostData.tags = postData.tags;
    }

    // Immagine in evidenza
    if (postData.featured_media && postData.featured_media > 0) {
      wpPostData.featured_media = postData.featured_media;
    }

    // Custom fields e meta
    if (postData.meta && Object.keys(postData.meta).length > 0) {
      wpPostData.meta = postData.meta;
    }

    // Controlli avanzati
    if (postData.comment_status) wpPostData.comment_status = postData.comment_status;
    if (postData.ping_status) wpPostData.ping_status = postData.ping_status;
    if (postData.sticky !== undefined) wpPostData.sticky = postData.sticky;

    // Crea il post su WordPress REST API
    const wpApiUrl = `${site.url}/wp-json/wp/v2/posts`;
    const auth = Buffer.from(`${site.username}:${site.password}`).toString('base64');

    const response = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wpPostData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Errore WordPress API:', errorData);

      return NextResponse.json(
        {
          error: `Errore WordPress: ${response.status} ${response.statusText}`,
          details: errorData,
          wpData: wpPostData // Per debug
        },
        { status: response.status }
      );
    }

    const createdPost = await response.json();

    // Salva anche nel nostro database per tracciamento completo
    try {
      await prisma.article.create({
        data: {
          // Campi base dell'articolo
          title: createdPost.title?.rendered || postData.title,
          content: createdPost.content?.rendered || postData.content,
          excerpt: createdPost.excerpt?.rendered || postData.excerpt || null,
          status: 'published',
          slug: createdPost.slug || postData.slug || null,

          // Metadati WordPress
          wordpressId: createdPost.id,
          wordpressSiteId: site.id,
          wordpressUrl: createdPost.link || null,
          wordpressStatus: createdPost.status || postData.status,

          // Tassonomie
          categories: createdPost.categories || postData.categories || null,
          tags: createdPost.tags || postData.tags || null,

          // Media e allegati
          featuredMediaId: createdPost.featured_media || postData.featured_media || null,
          featuredMediaUrl: null, // Da popolare in un secondo momento se necessario

          // Metadati di pubblicazione
          publishedAt: createdPost.status === 'publish' ? new Date(createdPost.date) : null,
          scheduledAt: createdPost.status === 'future' ? new Date(createdPost.date) : null,
          modifiedAt: createdPost.modified ? new Date(createdPost.modified) : null,

          // Configurazione post
          postFormat: postData.format || 'standard',
          postTemplate: postData.template || null,
          postPassword: postData.password || null,

          // Controlli di interazione
          commentStatus: postData.comment_status || null,
          pingStatus: postData.ping_status || null,
          isSticky: postData.sticky || false,

          // Metadati autore
          authorId: createdPost.author || postData.author || null,
          authorName: null, // Da popolare con lookup utente se necessario

          // Custom fields e meta
          customFields: postData.meta || null,
          metaFields: createdPost.meta || null,

          // Fonte e generazione
          sourceType: 'manual',
          sourceUrl: site.url,
          sourceTitle: site.name,

          // Metadati sistema
          lastSyncAt: new Date()
        }
      });
    } catch (dbError) {
      console.error('Errore salvataggio nel database locale:', dbError);
      // Non bloccare la risposta se il salvataggio locale fallisce
    }

    // Mappa il post creato nel formato necessario
    const mappedPost = {
      id: createdPost.id,
      title: createdPost.title?.rendered,
      content: createdPost.content?.rendered,
      excerpt: createdPost.excerpt?.rendered,
      status: createdPost.status,
      date: createdPost.date,
      modified: createdPost.modified,
      slug: createdPost.slug,
      link: createdPost.link,
      author: createdPost.author,
      categories: createdPost.categories,
      tags: createdPost.tags,
      featured_media: createdPost.featured_media,
      meta: createdPost.meta
    };

    return NextResponse.json({
      success: true,
      post: mappedPost,
      message: postData.status === 'publish' ? 'Articolo pubblicato con successo' : 'Articolo salvato come bozza'
    });

  } catch (error) {
    console.error('Errore nella creazione post WordPress:', error);
    return NextResponse.json(
      {
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}