const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_Vmi0eUX4dLSr@ep-solitary-sound-abznx4t0-pooler.eu-west-2.aws.neon.tech/autogeorge?sslmode=require"
    }
  }
});

async function enableAutoGeneration() {
  try {
    console.log('🔍 Checking existing sources...');

    // Mostra configurazioni attuali
    const sources = await prisma.source.findMany({
      select: {
        id: true,
        name: true,
        configuration: true,
      }
    });

    console.log('📊 Current sources configuration:');
    sources.forEach(source => {
      console.log(`  - ${source.name} (${source.id}):`, source.configuration);
    });

    // Aggiorna la prima source per abilitare auto-generazione
    if (sources.length > 0) {
      const sourceToUpdate = sources[0];
      console.log(`\n🔧 Updating source "${sourceToUpdate.name}" to enable auto-generation...`);

      const currentConfig = sourceToUpdate.configuration || {};
      const newConfig = {
        ...currentConfig,
        autoGenerate: true,
        enabled: true,
        maxItems: 10,
        pollingInterval: 60
      };

      const updatedSource = await prisma.source.update({
        where: { id: sourceToUpdate.id },
        data: { configuration: newConfig }
      });

      console.log(`✅ Updated source configuration:`, updatedSource.configuration);
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableAutoGeneration();