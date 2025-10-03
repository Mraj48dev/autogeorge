#!/usr/bin/env node

/**
 * Debug script to analyze problematic articles
 * Usage: node debug-articles.js
 */

const problematicArticles = [
  'art_81af8ebb-d620-494b-9c1c-cafea8809b1a',
  'art_71d0f8d6-0632-4f55-a540-ad8081d65e6c',
  'art_1e333951-dab2-4ffb-adfd-99fe4544301c',
  'art_27c88316-d3fd-4544-bbc7-a5ac2c753775',
  'art_27c76cc5-d844-4f8a-8d3f-e686ef19d587',
  'art_2e588b73-1c38-409b-9a3d-af3ed1adf4b1'
];

async function analyzeArticle(articleId) {
  try {
    console.log(`\n🔍 ANALYZING: ${articleId}`);
    console.log('='.repeat(50));

    const response = await fetch(`https://autogeorge.vercel.app/api/admin/articles/${articleId}`);

    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const data = await response.json();

    if (!data.success) {
      console.log(`❌ API Error: ${data.error}`);
      return;
    }

    const article = data.data.article;
    const statistics = data.data.statistics;

    console.log(`📝 Title: ${article.title}`);
    console.log(`📊 Status: ${article.status}`);
    console.log(`🗓️ Created: ${new Date(article.createdAt).toLocaleString()}`);

    // Analyze content issues
    console.log('\n📋 CONTENT ANALYSIS:');
    console.log(`   Length: ${statistics.characterCount} chars, ${statistics.wordCount} words`);
    console.log(`   Reading time: ${statistics.readingTime} min`);

    // Check content quality
    const content = article.content || '';
    const issues = [];

    if (content.length < 100) issues.push('Content too short');
    if (content.includes('undefined') || content.includes('null')) issues.push('Contains undefined/null values');
    if (content.includes('Generated content')) issues.push('Contains placeholder text');
    if (!content.includes('<p>') && !content.includes('<h2>')) issues.push('Missing HTML formatting');
    if (content.includes('{{') || content.includes('}}')) issues.push('Contains template placeholders');
    if (content.match(/\{.*\}/)) issues.push('Contains JSON/object notation');

    // Check for encoding issues
    if (content.includes('\\n') || content.includes('\\t')) issues.push('Contains escaped characters');
    if (content.includes('&quot;') || content.includes('&amp;')) issues.push('Contains HTML entities');

    // Check for malformed JSON in content
    if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
      issues.push('Content is JSON instead of HTML');
    }

    console.log(`   Issues found: ${issues.length}`);
    if (issues.length > 0) {
      issues.forEach(issue => console.log(`   ⚠️  ${issue}`));
    }

    // Sample content preview
    console.log('\n📖 CONTENT PREVIEW (first 200 chars):');
    console.log(`"${content.substring(0, 200)}..."`);

    // Check images
    console.log('\n🖼️ IMAGE ANALYSIS:');
    const hasImages = content.includes('<img') || content.includes('![');
    console.log(`   Has images in content: ${hasImages ? '✅' : '❌'}`);
    console.log(`   Featured media ID: ${article.featuredMediaId || 'None'}`);
    console.log(`   Featured media URL: ${article.featuredMediaUrl || 'None'}`);

    // Check AI generation data
    console.log('\n🤖 AI GENERATION DATA:');
    if (data.data.metadata) {
      console.log(`   Generation type: ${data.data.metadata.generationType}`);
      console.log(`   From feed: ${data.data.metadata.isFromFeed ? '✅' : '❌'}`);
      console.log(`   Original URL: ${data.data.metadata.originalUrl || 'None'}`);
    }

    // Return summary for batch analysis
    return {
      id: articleId,
      title: article.title,
      status: article.status,
      contentLength: statistics.characterCount,
      wordCount: statistics.wordCount,
      issues: issues,
      hasImages: hasImages,
      createdAt: article.createdAt
    };

  } catch (error) {
    console.log(`💥 Error analyzing ${articleId}:`, error.message);
    return { id: articleId, error: error.message };
  }
}

async function main() {
  console.log('🔍 ANALYZING PROBLEMATIC ARTICLES');
  console.log('==================================');

  const results = [];

  for (const articleId of problematicArticles) {
    const result = await analyzeArticle(articleId);
    if (result) results.push(result);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary analysis
  console.log('\n\n📊 SUMMARY ANALYSIS');
  console.log('===================');

  const validResults = results.filter(r => !r.error);
  const errorResults = results.filter(r => r.error);

  console.log(`Total articles analyzed: ${results.length}`);
  console.log(`Successful: ${validResults.length}`);
  console.log(`Errors: ${errorResults.length}`);

  if (errorResults.length > 0) {
    console.log('\n❌ ARTICLES WITH ERRORS:');
    errorResults.forEach(r => console.log(`   ${r.id}: ${r.error}`));
  }

  if (validResults.length > 0) {
    console.log('\n📋 COMMON ISSUES FOUND:');
    const allIssues = validResults.flatMap(r => r.issues);
    const issueCount = {};
    allIssues.forEach(issue => issueCount[issue] = (issueCount[issue] || 0) + 1);

    Object.entries(issueCount)
      .sort(([,a], [,b]) => b - a)
      .forEach(([issue, count]) => console.log(`   ${count}x: ${issue}`));

    console.log('\n📊 STATISTICS:');
    const avgLength = Math.round(validResults.reduce((sum, r) => sum + r.contentLength, 0) / validResults.length);
    const avgWords = Math.round(validResults.reduce((sum, r) => sum + r.wordCount, 0) / validResults.length);
    const withImages = validResults.filter(r => r.hasImages).length;

    console.log(`   Average content length: ${avgLength} characters`);
    console.log(`   Average word count: ${avgWords} words`);
    console.log(`   Articles with images: ${withImages}/${validResults.length}`);

    console.log('\n💡 RECOMMENDATIONS:');
    if (issueCount['Content too short']) {
      console.log('   - Increase minimum content length requirements');
    }
    if (issueCount['Contains undefined/null values']) {
      console.log('   - Fix null/undefined handling in content generation');
    }
    if (issueCount['Missing HTML formatting']) {
      console.log('   - Ensure proper HTML structure in AI prompts');
    }
    if (issueCount['Content is JSON instead of HTML']) {
      console.log('   - Fix JSON parsing in content extraction');
    }
    if (withImages < validResults.length / 2) {
      console.log('   - Investigate image generation/attachment issues');
    }
  }
}

// Run the analysis
main().catch(console.error);