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

    // Fetch degli utenti da WordPress REST API
    const wpApiUrl = `${site.url}/wp-json/wp/v2/users?per_page=100`;
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

    const users = await response.json();

    // Mappa gli utenti nel formato necessario
    const mappedUsers = users.map((user: any) => ({
      id: user.id,
      name: user.name,
      slug: user.slug,
      email: user.email,
      roles: user.roles,
      capabilities: user.capabilities
    }));

    return NextResponse.json({
      success: true,
      users: mappedUsers
    });

  } catch (error) {
    console.error('Errore nel recupero utenti WordPress:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}