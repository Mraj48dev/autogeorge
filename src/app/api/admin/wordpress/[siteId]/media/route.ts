import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

export async function GET(
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

    // Fetch dei media da WordPress REST API
    const wpApiUrl = `${site.url}/wp-json/wp/v2/media?per_page=50`;
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

    const media = await response.json();

    // Mappa i media nel formato necessario
    const mappedMedia = media.map((item: any) => ({
      id: item.id,
      title: item.title?.rendered || item.slug,
      url: item.source_url,
      alt_text: item.alt_text,
      caption: item.caption?.rendered || '',
      media_type: item.media_type,
      mime_type: item.mime_type,
      media_details: item.media_details
    }));

    return NextResponse.json({
      success: true,
      media: mappedMedia
    });

  } catch (error) {
    console.error('Errore nel recupero media WordPress:', error);
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

    // Leggi i dati del form
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const altText = formData.get('alt_text') as string;
    const caption = formData.get('caption') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Nessun file specificato' },
        { status: 400 }
      );
    }

    // Prepara il form data per WordPress
    const wpFormData = new FormData();
    wpFormData.append('file', file);

    if (title) wpFormData.append('title', title);
    if (altText) wpFormData.append('alt_text', altText);
    if (caption) wpFormData.append('caption', caption);

    // Upload del file a WordPress REST API
    const wpApiUrl = `${site.url}/wp-json/wp/v2/media`;
    const auth = Buffer.from(`${site.username}:${site.password}`).toString('base64');

    const response = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`
      },
      body: wpFormData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: `Errore WordPress: ${response.status} ${response.statusText}`, details: errorData },
        { status: response.status }
      );
    }

    const uploadedMedia = await response.json();

    // Salva il media nel nostro database con TUTTI i metadati WordPress
    try {
      await prisma.wordPressMedia.create({
        data: {
          // Metadati WordPress Media
          wordpressId: uploadedMedia.id,
          wordpressSiteId: site.id,
          status: uploadedMedia.status || 'publish',
          slug: uploadedMedia.slug || null,
          author: uploadedMedia.author || null,

          // Date WordPress native
          uploadedAt: uploadedMedia.date ? new Date(uploadedMedia.date) : null,
          uploadedAtGmt: uploadedMedia.date_gmt ? new Date(uploadedMedia.date_gmt) : null,
          modifiedAt: uploadedMedia.modified ? new Date(uploadedMedia.modified) : null,
          modifiedAtGmt: uploadedMedia.modified_gmt ? new Date(uploadedMedia.modified_gmt) : null,

          // Metadati base del file
          title: uploadedMedia.title?.rendered || title || uploadedMedia.slug,
          altText: uploadedMedia.alt_text || altText || null,
          caption: uploadedMedia.caption?.rendered || caption || null,
          description: uploadedMedia.description?.rendered || null,

          // Informazioni tecniche del file
          mediaType: uploadedMedia.media_type || 'image',
          mimeType: uploadedMedia.mime_type || file.type,
          sourceUrl: uploadedMedia.source_url,
          link: uploadedMedia.link || null,

          // Dettagli tecnici avanzati
          fileSize: uploadedMedia.media_details?.filesize || file.size || null,
          fileName: uploadedMedia.media_details?.file || file.name || null,
          width: uploadedMedia.media_details?.width || null,
          height: uploadedMedia.media_details?.height || null,

          // Metadati WordPress avanzati
          guid: uploadedMedia.guid || null,
          mediaDetails: uploadedMedia.media_details || null,
          postId: uploadedMedia.post || null,

          // Metadati aggiuntivi
          customFields: null, // Da popolare con custom fields se necessario
          metaFields: uploadedMedia.meta || null,
          wordpressData: uploadedMedia, // JSON completo della risposta WordPress

          // Metadati sistema
          lastSyncAt: new Date()
        }
      });
    } catch (dbError) {
      console.error('Errore salvataggio media nel database:', dbError);
      // Non bloccare la risposta se il salvataggio locale fallisce
    }

    // Mappa il media nel formato necessario per il frontend
    const mappedMedia = {
      id: uploadedMedia.id,
      title: uploadedMedia.title?.rendered || uploadedMedia.slug,
      url: uploadedMedia.source_url,
      alt_text: uploadedMedia.alt_text,
      caption: uploadedMedia.caption?.rendered || '',
      media_type: uploadedMedia.media_type,
      mime_type: uploadedMedia.mime_type,
      media_details: uploadedMedia.media_details,
      file_size: uploadedMedia.media_details?.filesize,
      width: uploadedMedia.media_details?.width,
      height: uploadedMedia.media_details?.height
    };

    return NextResponse.json({
      success: true,
      media: mappedMedia
    });

  } catch (error) {
    console.error('Errore nell\'upload media WordPress:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}