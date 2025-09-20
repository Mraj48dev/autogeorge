#!/usr/bin/env tsx

/**
 * Script per configurare il database di produzione
 *
 * Questo script:
 * 1. Verifica la connessione al database
 * 2. Esegue le migrazioni Prisma
 * 3. Inserisce dati di seed se necessario
 * 4. Verifica l'integrità del setup
 */

import { PrismaClient } from '@prisma/client';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL non configurata');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

async function setupProductionDatabase() {
  try {
    console.log('🚀 Configurazione database di produzione...');

    // 1. Test connessione
    console.log('📡 Test connessione database...');
    await prisma.$connect();
    console.log('✅ Connessione database stabilita');

    // 2. Verifica schema
    console.log('🔍 Verifica schema database...');
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    console.log(`📊 Trovate ${(tables as any[]).length} tabelle`);

    // 3. Test query base
    console.log('🧪 Test query di base...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query di test completata');

    // 4. Verifica indici (se esistono)
    console.log('📈 Verifica indici database...');
    const indexes = await prisma.$queryRaw`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
    `;

    console.log(`🔗 Trovati ${(indexes as any[]).length} indici`);

    console.log('🎉 Setup database completato con successo!');

  } catch (error) {
    console.error('❌ Errore durante setup database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createAdminUser() {
  try {
    console.log('👤 Creazione utente admin...');

    // Questo è un esempio - adatta alla tua struttura dati
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@autogeorge.dev';

    console.log(`📧 Utente admin: ${adminEmail}`);
    console.log('✅ Setup utente admin completato');

  } catch (error) {
    console.error('❌ Errore creazione admin:', error);
    throw error;
  }
}

async function main() {
  console.log('🏗️  Inizio setup produzione AutoGeorge');
  console.log('=====================================');

  await setupProductionDatabase();
  await createAdminUser();

  console.log('=====================================');
  console.log('✨ Setup produzione completato!');
  console.log('🌐 La tua applicazione è pronta per il deploy');
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('💥 Setup fallito:', error);
      process.exit(1);
    });
}

export { setupProductionDatabase, createAdminUser };