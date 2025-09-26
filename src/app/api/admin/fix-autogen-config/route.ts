import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/database/prisma';

/**
 * FIX DEFINITIVO: Forza la configurazione auto-generazione e impedisce sovrascrittura
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [FIX] Forcing auto-generation configuration...');

    const sourceId = 'cmfzyrmw5jbbfpd8c'; // Sito di test

    // STEP 1: Pulisci la configurazione corrotta
    const currentSource = await prisma.source.findUnique({
      where: { id: sourceId }
    });

    if (!currentSource) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    console.log('📊 [FIX] Current configuration:', currentSource.configuration);

    // STEP 2: Forza configurazione corretta nel database
    const correctConfig = {
      enabled: true,
      maxItems: 10,
      pollingInterval: 60,
      autoGenerate: true,
      // Preserva metadati esistenti se presenti
      ...(typeof currentSource.configuration === 'object' && currentSource.configuration !== null ? {
        totalFetches: (currentSource.configuration as any).totalFetches,
        totalItems: (currentSource.configuration as any).totalItems,
        totalNewItems: (currentSource.configuration as any).totalNewItems
      } : {})
    };

    const updatedSource = await prisma.source.update({
      where: { id: sourceId },
      data: {
        configuration: correctConfig
      }
    });

    console.log('✅ [FIX] Updated configuration:', updatedSource.configuration);

    // STEP 3: Verifica che sia salvato correttamente
    const verifySource = await prisma.source.findUnique({
      where: { id: sourceId },
      select: { id: true, name: true, configuration: true }
    });

    return NextResponse.json({
      success: true,
      sourceId,
      oldConfiguration: currentSource.configuration,
      newConfiguration: verifySource?.configuration,
      autoGenerateActive: !!(verifySource?.configuration as any)?.autoGenerate,
      message: 'Auto-generation configuration fixed and verified'
    });

  } catch (error) {
    console.error('❌ [FIX] Failed to fix auto-generation config:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}