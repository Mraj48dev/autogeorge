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

    // Fetch dei formati post da WordPress REST API
    const wpApiUrl = `${site.url}/wp-json/wp/v2/types/post`;
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

    const postType = await response.json();

    // Estrai i formati supportati o usa quelli di default
    const supportedFormats = postType.supports?.['post-formats'] || [];

    // Formati post standard di WordPress
    const defaultFormats = [
      { slug: 'standard', name: 'Standard' },
      { slug: 'aside', name: 'Aside' },
      { slug: 'gallery', name: 'Gallery' },
      { slug: 'link', name: 'Link' },
      { slug: 'image', name: 'Image' },
      { slug: 'quote', name: 'Quote' },
      { slug: 'status', name: 'Status' },
      { slug: 'video', name: 'Video' },
      { slug: 'audio', name: 'Audio' },
      { slug: 'chat', name: 'Chat' }
    ];

    // Filtra solo i formati supportati dal tema
    const availableFormats = supportedFormats.length > 0
      ? defaultFormats.filter(format => supportedFormats.includes(format.slug))
      : defaultFormats;

    return NextResponse.json({
      success: true,
      formats: availableFormats
    });

  } catch (error) {
    console.error('Errore nel recupero formati post WordPress:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}