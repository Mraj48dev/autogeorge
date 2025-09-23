import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

/**
 * HOTFIX API - Risolve temporaneamente il problema RSS polling
 * Può essere chiamato per pulire i dati problematici senza deploy
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚨 HOTFIX: Starting RSS polling fix...');

    const prisma = new PrismaClient();

    try {
      // 1. Identifica il feed item problematico dai log
      const problematicTitle = "Nick Robinson: How the simmering row over freedom of speech in the UK reached boiling point";

      // 2. Trova tutti i record duplicati per questo titolo
      const duplicates = await prisma.feedItem.findMany({
        where: {
          title: {
            contains: "Nick Robinson"
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      console.log(`📊 Found ${duplicates.length} records with problematic title`);

      // 3. Se ci sono duplicati, tieni solo il più vecchio
      if (duplicates.length > 1) {
        const toDelete = duplicates.slice(1);

        for (const duplicate of toDelete) {
          await prisma.feedItem.delete({
            where: { id: duplicate.id }
          });
          console.log(`🗑️ Removed duplicate: ${duplicate.id}`);
        }

        console.log(`✅ Removed ${toDelete.length} duplicate records`);
      }

      // 4. Controlla tutti i possibili constraint violation
      const urlDuplicates = await prisma.$queryRaw`
        SELECT "sourceId", "url", COUNT(*) as count
        FROM "feed_items"
        WHERE "url" IS NOT NULL
        GROUP BY "sourceId", "url"
        HAVING COUNT(*) > 1
        LIMIT 10
      `;

      console.log(`📊 URL duplicates found: ${urlDuplicates.length}`);

      // 5. Rimuovi tutti i duplicati URL
      for (const dup of urlDuplicates) {
        const records = await prisma.feedItem.findMany({
          where: {
            sourceId: dup.sourceId,
            url: dup.url
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        // Tieni il primo, rimuovi gli altri
        const toDelete = records.slice(1);
        for (const record of toDelete) {
          await prisma.feedItem.delete({
            where: { id: record.id }
          });
        }

        console.log(`✅ Cleaned ${toDelete.length} URL duplicates for ${dup.url}`);
      }

      // 6. Verifica che non ci siano più constraint violation
      const finalCheck = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM (
          SELECT "sourceId", "url", COUNT(*)
          FROM "feed_items"
          WHERE "url" IS NOT NULL
          GROUP BY "sourceId", "url"
          HAVING COUNT(*) > 1
        ) remaining
      `;

      const isFixed = finalCheck[0]?.count === 0;

      console.log(`🎯 HOTFIX RESULT: ${isFixed ? 'SUCCESS' : 'PARTIAL'}`);

      return NextResponse.json({
        success: true,
        message: 'Hotfix completed',
        results: {
          duplicatesRemoved: duplicates.length > 1 ? duplicates.length - 1 : 0,
          urlDuplicatesFixed: urlDuplicates.length,
          isFullyFixed: isFixed,
          timestamp: new Date().toISOString()
        }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('💥 Hotfix failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Hotfix failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Mostra lo stato attuale dei duplicati
 */
export async function GET(request: NextRequest) {
  try {
    const prisma = new PrismaClient();

    try {
      // Analizza lo stato attuale
      const urlDuplicates = await prisma.$queryRaw`
        SELECT "sourceId", "url", COUNT(*) as count
        FROM "feed_items"
        WHERE "url" IS NOT NULL
        GROUP BY "sourceId", "url"
        HAVING COUNT(*) > 1
      `;

      const guidDuplicates = await prisma.$queryRaw`
        SELECT "sourceId", "guid", COUNT(*) as count
        FROM "feed_items"
        WHERE "guid" IS NOT NULL
        GROUP BY "sourceId", "guid"
        HAVING COUNT(*) > 1
      `;

      const totalFeedItems = await prisma.feedItem.count();

      return NextResponse.json({
        success: true,
        status: {
          totalFeedItems,
          urlDuplicates: urlDuplicates.length,
          guidDuplicates: guidDuplicates.length,
          hasConstraintIssues: urlDuplicates.length > 0 || guidDuplicates.length > 0,
          timestamp: new Date().toISOString()
        },
        duplicates: {
          urls: urlDuplicates.slice(0, 5), // Prime 5 per debugging
          guids: guidDuplicates.slice(0, 5)
        }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('💥 Status check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Status check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}