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

    // Mappa il media nel formato necessario
    const mappedMedia = {
      id: uploadedMedia.id,
      title: uploadedMedia.title?.rendered || uploadedMedia.slug,
      url: uploadedMedia.source_url,
      alt_text: uploadedMedia.alt_text,
      caption: uploadedMedia.caption?.rendered || '',
      media_type: uploadedMedia.media_type,
      mime_type: uploadedMedia.mime_type,
      media_details: uploadedMedia.media_details
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