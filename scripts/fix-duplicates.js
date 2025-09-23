const { PrismaClient } = require('@prisma/client');

/**
 * Script per rimuovere duplicati dal database in produzione
 * Risolve il problema dei constraint violation senza deploy
 */
async function fixDuplicates() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log('🚀 Starting duplicate cleanup...');

    // 1. Trova tutti i duplicati per (sourceId, url)
    const duplicatesByUrl = await prisma.$queryRaw`
      SELECT "sourceId", "url", COUNT(*) as count, MIN("createdAt") as first_created
      FROM "feed_items"
      WHERE "url" IS NOT NULL
      GROUP BY "sourceId", "url"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    console.log(`📊 Found ${duplicatesByUrl.length} duplicate URL groups`);

    // 2. Trova tutti i duplicati per (sourceId, guid)
    const duplicatesByGuid = await prisma.$queryRaw`
      SELECT "sourceId", "guid", COUNT(*) as count, MIN("createdAt") as first_created
      FROM "feed_items"
      WHERE "guid" IS NOT NULL
      GROUP BY "sourceId", "guid"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    console.log(`📊 Found ${duplicatesByGuid.length} duplicate GUID groups`);

    let totalRemoved = 0;

    // 3. Rimuovi duplicati per URL - tieni solo il più vecchio
    for (const duplicate of duplicatesByUrl) {
      try {
        // Trova tutti i record per questa combinazione sourceId + url
        const allRecords = await prisma.feedItem.findMany({
          where: {
            sourceId: duplicate.sourceId,
            url: duplicate.url
          },
          orderBy: {
            createdAt: 'asc' // Il più vecchio primo
          }
        });

        // Tieni il primo (più vecchio) e rimuovi gli altri
        const toDelete = allRecords.slice(1);

        for (const record of toDelete) {
          await prisma.feedItem.delete({
            where: { id: record.id }
          });
          totalRemoved++;
          console.log(`🗑️  Removed duplicate: ${record.title.substring(0, 50)}...`);
        }

        console.log(`✅ Cleaned ${toDelete.length} duplicates for URL: ${duplicate.url}`);
      } catch (error) {
        console.error(`❌ Error cleaning URL duplicate:`, error.message);
      }
    }

    // 4. Rimuovi duplicati per GUID - tieni solo il più vecchio
    for (const duplicate of duplicatesByGuid) {
      try {
        // Trova tutti i record per questa combinazione sourceId + guid
        const allRecords = await prisma.feedItem.findMany({
          where: {
            sourceId: duplicate.sourceId,
            guid: duplicate.guid
          },
          orderBy: {
            createdAt: 'asc' // Il più vecchio primo
          }
        });

        // Tieni il primo (più vecchio) e rimuovi gli altri
        const toDelete = allRecords.slice(1);

        for (const record of toDelete) {
          // Controlla che non sia già stato eliminato nella fase precedente
          const exists = await prisma.feedItem.findUnique({
            where: { id: record.id }
          });

          if (exists) {
            await prisma.feedItem.delete({
              where: { id: record.id }
            });
            totalRemoved++;
            console.log(`🗑️  Removed GUID duplicate: ${record.title.substring(0, 50)}...`);
          }
        }

        console.log(`✅ Cleaned ${toDelete.length} GUID duplicates for: ${duplicate.guid}`);
      } catch (error) {
        console.error(`❌ Error cleaning GUID duplicate:`, error.message);
      }
    }

    // 5. Verifica finale
    const remainingDuplicatesUrl = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM (
        SELECT "sourceId", "url", COUNT(*)
        FROM "feed_items"
        WHERE "url" IS NOT NULL
        GROUP BY "sourceId", "url"
        HAVING COUNT(*) > 1
      ) duplicates
    `;

    const remainingDuplicatesGuid = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM (
        SELECT "sourceId", "guid", COUNT(*)
        FROM "feed_items"
        WHERE "guid" IS NOT NULL
        GROUP BY "sourceId", "guid"
        HAVING COUNT(*) > 1
      ) duplicates
    `;

    console.log(`\n🎉 CLEANUP COMPLETED!`);
    console.log(`📊 Total records removed: ${totalRemoved}`);
    console.log(`📊 Remaining URL duplicates: ${remainingDuplicatesUrl[0]?.count || 0}`);
    console.log(`📊 Remaining GUID duplicates: ${remainingDuplicatesGuid[0]?.count || 0}`);

    if (remainingDuplicatesUrl[0]?.count === 0 && remainingDuplicatesGuid[0]?.count === 0) {
      console.log(`✅ ALL DUPLICATES REMOVED! RSS polling should work now.`);
    } else {
      console.log(`⚠️  Some duplicates remain. Manual investigation may be needed.`);
    }

  } catch (error) {
    console.error('💥 Critical error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  fixDuplicates()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixDuplicates };