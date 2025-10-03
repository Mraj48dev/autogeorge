#!/usr/bin/env node

/**
 * Test the regex recovery logic with actual corrupted content
 */

async function testRegexRecovery() {
  try {
    // Get the actual corrupted content
    const response = await fetch('https://autogeorge.vercel.app/api/admin/articles/art_81af8ebb-d620-494b-9c1c-cafea8809b1a');
    const data = await response.json();
    const jsonContent = data.data.article.content;

    console.log('🔧 TESTING REGEX RECOVERY');
    console.log('=========================');
    console.log('Content length:', jsonContent.length);
    console.log('Content preview:', jsonContent.substring(0, 200) + '...');

    // Test each regex pattern
    console.log('\n📋 REGEX PATTERN TESTS:');

    const titleMatch = jsonContent.match(/"title":\s*"([^"]+)"/);
    console.log('Title match:', titleMatch ? titleMatch[1] : 'NO MATCH');

    const slugMatch = jsonContent.match(/"slug":\s*"([^"]+)"/);
    console.log('Slug match:', slugMatch ? slugMatch[1] : 'NO MATCH');

    const metaMatch = jsonContent.match(/"meta_description":\s*"([^"]+)"/);
    console.log('Meta description match:', metaMatch ? metaMatch[1].substring(0, 100) + '...' : 'NO MATCH');

    const tagsMatch = jsonContent.match(/"tags":\s*\[([^\]]+)\]/);
    console.log('Tags match:', tagsMatch ? tagsMatch[1] : 'NO MATCH');

    // For content, we need a different approach because it contains HTML
    const contentMatch = jsonContent.match(/"content":\s*"([^"]*(?:\\.[^"]*)*)"/);
    console.log('Content match:', contentMatch ? 'FOUND (length: ' + contentMatch[1].length + ')' : 'NO MATCH');

    // Try alternative content extraction
    const contentMatch2 = jsonContent.match(/"content":\s*"(.*?)(?=",[^"]*"[^"]*":)/s);
    console.log('Alternative content match:', contentMatch2 ? 'FOUND (length: ' + contentMatch2[1].length + ')' : 'NO MATCH');

    const imagePromptMatch = jsonContent.match(/"ai_prompt":\s*"([^"]+)"/);
    console.log('Image prompt match:', imagePromptMatch ? imagePromptMatch[1].substring(0, 100) + '...' : 'NO MATCH');

    // If we found title, try to build the extracted data
    if (titleMatch) {
      console.log('\n✅ BUILDING EXTRACTED DATA:');

      let tags = [];
      if (tagsMatch) {
        try {
          const tagsStr = '[' + tagsMatch[1] + ']';
          tags = JSON.parse(tagsStr);
          console.log('Tags parsed successfully:', tags);
        } catch (e) {
          console.log('Tags parse failed, trying manual extraction');
          tags = tagsMatch[1].split(',').map(t => t.replace(/"/g, '').trim()).filter(Boolean);
          console.log('Tags extracted manually:', tags);
        }
      }

      // Use the better content match
      let cleanContent = contentMatch2 ? contentMatch2[1] : (contentMatch ? contentMatch[1] : 'Contenuto recuperato da articolo corrotto.');

      // Clean up escape characters
      cleanContent = cleanContent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

      const extractedData = {
        title: titleMatch[1],
        content: cleanContent,
        slug: slugMatch ? slugMatch[1] : null,
        meta_description: metaMatch ? metaMatch[1] : null,
        tags: tags,
        ai_image_prompt: imagePromptMatch ? imagePromptMatch[1] : null
      };

      console.log('✅ EXTRACTED DATA SUMMARY:');
      console.log('Title:', extractedData.title);
      console.log('Content length:', extractedData.content.length);
      console.log('Slug:', extractedData.slug);
      console.log('Meta description length:', extractedData.meta_description?.length || 0);
      console.log('Tags count:', extractedData.tags.length);
      console.log('Has image prompt:', !!extractedData.ai_image_prompt);

      console.log('\n🎯 CONTENT PREVIEW:');
      console.log(extractedData.content.substring(0, 500) + '...');

      return extractedData;
    } else {
      console.log('❌ No title found, cannot proceed with extraction');
      return null;
    }

  } catch (error) {
    console.log('💥 Test error:', error.message);
    return null;
  }
}

// Run the test
testRegexRecovery().then(result => {
  if (result) {
    console.log('\n🚀 SUCCESS: Recovery logic works! The issue must be in the server implementation.');
  } else {
    console.log('\n❌ FAILURE: Recovery logic needs adjustment.');
  }
}).catch(console.error);