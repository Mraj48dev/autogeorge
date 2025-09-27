import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = params;

    // Recupera i dati del sito dal database
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!site) {
      return NextResponse.json(
        { error: 'Sito non trovato' },
        { status: 404 }
      );
    }

    // Fetch dei tag da WordPress REST API
    const wpApiUrl = `${site.url}/wp-json/wp/v2/tags?per_page=100`;
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

    const tags = await response.json();

    // Mappa i tag nel formato necessario
    const mappedTags = tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      count: tag.count,
      description: tag.description
    }));

    return NextResponse.json({
      success: true,
      tags: mappedTags
    });

  } catch (error) {
    console.error('Errore nel recupero tag WordPress:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}