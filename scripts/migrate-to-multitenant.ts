#!/usr/bin/env ts-node

/**
 * MULTI-TENANT MIGRATION SCRIPT
 *
 * This script migrates existing single-tenant data to multi-tenant structure
 * by assigning all existing resources to the first user in the database.
 *
 * ⚠️  CRITICAL: This script should only be run ONCE during the migration
 * ⚠️  BACKUP: Ensure database backup exists before running
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToMultiTenant() {
  console.log('🚀 Starting Multi-Tenant Migration...');

  try {
    // Step 1: Find the first user
    console.log('🔍 Finding first user...');
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!firstUser) {
      console.error('❌ No users found in database. Cannot proceed with migration.');
      console.log('💡 Please create at least one user before running this migration.');
      process.exit(1);
    }

    console.log(`✅ Found first user: ${firstUser.email} (ID: ${firstUser.id})`);

    // Step 2: Count existing resources
    const counts = {
      sources: await prisma.source.count(),
      publications: await prisma.publication.count(),
      featuredImages: await prisma.featuredImage.count(),
      imagePrompts: await prisma.imagePrompt.count()
    };

    console.log('📊 Current resource counts:');
    console.log(`   Sources: ${counts.sources}`);
    console.log(`   Publications: ${counts.publications}`);
    console.log(`   Featured Images: ${counts.featuredImages}`);
    console.log(`   Image Prompts: ${counts.imagePrompts}`);

    if (counts.sources === 0 && counts.publications === 0 &&
        counts.featuredImages === 0 && counts.imagePrompts === 0) {
      console.log('✅ No existing data to migrate. Migration complete.');
      return;
    }

    // Step 3: Migrate sources (most critical table)
    console.log('🔄 Migrating sources...');
    const sourcesUpdated = await prisma.source.updateMany({
      where: {
        userId: null // Only update sources without userId
      },
      data: {
        userId: firstUser.id
      }
    });
    console.log(`✅ Updated ${sourcesUpdated.count} sources`);

    // Step 4: Migrate publications
    console.log('🔄 Migrating publications...');
    const publicationsUpdated = await prisma.publication.updateMany({
      where: {
        userId: null // Only update publications without userId
      },
      data: {
        userId: firstUser.id
      }
    });
    console.log(`✅ Updated ${publicationsUpdated.count} publications`);

    // Step 5: Migrate featured images
    console.log('🔄 Migrating featured images...');
    const featuredImagesUpdated = await prisma.featuredImage.updateMany({
      where: {
        userId: null // Only update featured images without userId
      },
      data: {
        userId: firstUser.id
      }
    });
    console.log(`✅ Updated ${featuredImagesUpdated.count} featured images`);

    // Step 6: Migrate image prompts
    console.log('🔄 Migrating image prompts...');
    const imagePromptsUpdated = await prisma.imagePrompt.updateMany({
      where: {
        userId: null // Only update image prompts without userId
      },
      data: {
        userId: firstUser.id
      }
    });
    console.log(`✅ Updated ${imagePromptsUpdated.count} image prompts`);

    // Step 7: Verify data integrity
    console.log('🔍 Verifying data integrity...');

    // Check for orphaned records
    const orphanedSources = await prisma.source.count({
      where: { userId: null }
    });

    const orphanedPublications = await prisma.publication.count({
      where: { userId: null }
    });

    const orphanedFeaturedImages = await prisma.featuredImage.count({
      where: { userId: null }
    });

    const orphanedImagePrompts = await prisma.imagePrompt.count({
      where: { userId: null }
    });

    if (orphanedSources > 0 || orphanedPublications > 0 ||
        orphanedFeaturedImages > 0 || orphanedImagePrompts > 0) {
      console.error('❌ Data integrity check failed!');
      console.error(`   Orphaned sources: ${orphanedSources}`);
      console.error(`   Orphaned publications: ${orphanedPublications}`);
      console.error(`   Orphaned featured images: ${orphanedFeaturedImages}`);
      console.error(`   Orphaned image prompts: ${orphanedImagePrompts}`);
      process.exit(1);
    }

    // Step 8: Verify relationships
    console.log('🔗 Verifying relationships...');
    const userWithResources = await prisma.user.findUnique({
      where: { id: firstUser.id },
      include: {
        sources: true,
        publications: true,
        featuredImages: true,
        imagePrompts: true
      }
    });

    if (!userWithResources) {
      console.error('❌ Failed to find user with migrated resources');
      process.exit(1);
    }

    console.log('✅ Data integrity verified!');
    console.log(`   User ${userWithResources.email} now owns:`);
    console.log(`   - ${userWithResources.sources.length} sources`);
    console.log(`   - ${userWithResources.publications.length} publications`);
    console.log(`   - ${userWithResources.featuredImages.length} featured images`);
    console.log(`   - ${userWithResources.imagePrompts.length} image prompts`);

    console.log('🎉 Multi-Tenant Migration completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Update API endpoints to use userId filtering');
    console.log('   2. Update frontend to use site context');
    console.log('   3. Test with multiple users');
    console.log('   4. Deploy the changes');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    console.log('');
    console.log('🚨 ROLLBACK REQUIRED:');
    console.log('   1. Stop the application');
    console.log('   2. Restore database from backup');
    console.log('   3. Investigate the error');
    console.log('   4. Fix the issue and retry');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Allow script to be run directly
if (require.main === module) {
  migrateToMultiTenant().catch(console.error);
}

export { migrateToMultiTenant };