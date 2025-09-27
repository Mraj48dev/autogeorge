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

    // Fetch delle categorie da WordPress REST API
    const wpApiUrl = `${site.url}/wp-json/wp/v2/categories?per_page=100`;
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

    const categories = await response.json();

    // Mappa le categorie nel formato necessario
    const mappedCategories = categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parent: cat.parent,
      count: cat.count,
      description: cat.description
    }));

    return NextResponse.json({
      success: true,
      categories: mappedCategories
    });

  } catch (error) {
    console.error('Errore nel recupero categorie WordPress:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}