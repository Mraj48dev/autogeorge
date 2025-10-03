#!/usr/bin/env node

/**
 * Emergency script to fix corrupted articles directly
 * Usage: node fix-corrupted-articles.js
 */

const problematicArticles = [
  'art_81af8ebb-d620-494b-9c1c-cafea8809b1a',
  'art_71d0f8d6-0632-4f55-a540-ad8081d65e6c',
  'art_1e333951-dab2-4ffb-adfd-99fe4544301c',
  'art_27c88316-d3fd-4544-bbc7-a5ac2c753775',
  'art_27c76cc5-d844-4f8a-8d3f-e686ef19d587',
  'art_2e588b73-1c38-409b-9a3d-af3ed1adf4b1'
];

async function fixArticle(articleId) {
  try {
    console.log(`\n🔧 FIXING: ${articleId}`);
    console.log('='.repeat(50));

    const response = await fetch(`https://autogeorge.vercel.app/api/admin/articles/${articleId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'fix-corruption' })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`✅ Fixed successfully:`);
      console.log(`   Title: ${data.extractedData.title}`);
      console.log(`   Content length: ${data.extractedData.contentLength} chars`);
      console.log(`   Slug: ${data.extractedData.slug || 'None'}`);
      console.log(`   Meta description: ${data.extractedData.metaDescription ? 'Yes' : 'No'}`);
      return { id: articleId, success: true, title: data.extractedData.title };
    } else {
      console.log(`❌ Fix failed: ${data.error || 'Unknown error'}`);
      return { id: articleId, success: false, error: data.error };
    }

  } catch (error) {
    console.log(`💥 Error fixing ${articleId}:`, error.message);
    return { id: articleId, success: false, error: error.message };
  }
}

async function main() {
  console.log('🔧 FIXING CORRUPTED ARTICLES');
  console.log('=============================');

  const results = [];

  for (const articleId of problematicArticles) {
    const result = await fixArticle(articleId);
    results.push(result);

    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('==========');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total articles processed: ${results.length}`);
  console.log(`Successfully fixed: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);

  if (successful.length > 0) {
    console.log('\n✅ SUCCESSFULLY FIXED:');
    successful.forEach(r => console.log(`   ${r.id}: "${r.title}"`));
  }

  if (failed.length > 0) {
    console.log('\n❌ FAILED TO FIX:');
    failed.forEach(r => console.log(`   ${r.id}: ${r.error}`));
  }

  console.log('\n🎯 To verify fixes, check the articles in the admin panel:');
  console.log('https://autogeorge.vercel.app/admin/articles');
}

// Run the fix
main().catch(console.error);