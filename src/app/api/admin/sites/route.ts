import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

export async function GET(request: NextRequest) {
  try {
    // Recupera tutti i siti WordPress configurati
    const sites = await prisma.wordPressSite.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        url: true,
        username: true,
        password: true,
        defaultCategory: true,
        defaultStatus: true,
        defaultAuthor: true,
        enableAutoPublish: true,
        enableFeaturedImage: true,
        enableTags: true,
        enableCategories: true,
        customFields: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Mappa i siti nel formato necessario per il frontend
    const mappedSites = sites.map(site => ({
      id: site.id,
      name: site.name,
      url: site.url,
      username: site.username,
      password: site.password,
      defaultCategory: site.defaultCategory,
      defaultStatus: site.defaultStatus,
      defaultAuthor: site.defaultAuthor,
      enableAutoPublish: site.enableAutoPublish,
      enableFeaturedImage: site.enableFeaturedImage,
      enableTags: site.enableTags,
      enableCategories: site.enableCategories,
      customFields: site.customFields,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt
    }));

    return NextResponse.json({
      success: true,
      sites: mappedSites,
      count: mappedSites.length
    });

  } catch (error) {
    console.error('Errore nel recupero siti WordPress:', error);
    return NextResponse.json(
      {
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const siteData = await request.json();

    // Valida i dati obbligatori
    if (!siteData.name || !siteData.url || !siteData.username || !siteData.password) {
      return NextResponse.json(
        { error: 'Nome, URL, username e password sono obbligatori' },
        { status: 400 }
      );
    }

    // Crea un nuovo sito WordPress
    const newSite = await prisma.wordPressSite.create({
      data: {
        userId: siteData.userId || 'default', // TODO: Usare l'ID dell'utente autenticato
        name: siteData.name,
        url: siteData.url.replace(/\/$/, ''), // Rimuovi trailing slash
        username: siteData.username,
        password: siteData.password,
        defaultCategory: siteData.defaultCategory || null,
        defaultStatus: siteData.defaultStatus || 'draft',
        defaultAuthor: siteData.defaultAuthor || null,
        enableAutoPublish: siteData.enableAutoPublish || false,
        enableFeaturedImage: siteData.enableFeaturedImage !== false,
        enableTags: siteData.enableTags !== false,
        enableCategories: siteData.enableCategories !== false,
        customFields: siteData.customFields || null,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      site: newSite,
      message: 'Sito WordPress creato con successo'
    });

  } catch (error) {
    console.error('Errore nella creazione sito WordPress:', error);
    return NextResponse.json(
      {
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}