#!/usr/bin/env node

/**
 * Manual extraction script to understand the exact corruption pattern
 */

async function analyzeCorruption() {
  const articleId = 'art_81af8ebb-d620-494b-9c1c-cafea8809b1a';

  try {
    console.log('🔍 ANALYZING CORRUPTION PATTERN');
    console.log('================================');

    const response = await fetch(`https://autogeorge.vercel.app/api/admin/articles/${articleId}`);
    const data = await response.json();

    if (!data.success) {
      console.log('❌ Failed to fetch article:', data.error);
      return;
    }

    const article = data.data.article;

    console.log('\n📋 ARTICLE STRUCTURE:');
    console.log('Title:', JSON.stringify(article.title));
    console.log('Content length:', article.content?.length || 0);
    console.log('Content starts with:', JSON.stringify(article.content?.substring(0, 100)));

    // Try to parse the content manually
    console.log('\n🔧 MANUAL PARSING ATTEMPT:');

    if (article.content) {
      try {
        const parsed = JSON.parse(article.content);
        console.log('✅ JSON parsing successful!');
        console.log('Top-level keys:', Object.keys(parsed));

        if (parsed.article) {
          console.log('Article object found with keys:', Object.keys(parsed.article));

          if (parsed.article.basic_data) {
            console.log('Basic data found:', {
              title: parsed.article.basic_data.title,
              slug: parsed.article.basic_data.slug,
              tags: parsed.article.basic_data.tags?.length || 0
            });
          }

          if (parsed.article.content) {
            console.log('Content found, length:', parsed.article.content.length);
            console.log('Content preview:', parsed.article.content.substring(0, 200) + '...');
          }

          if (parsed.article.seo_critical) {
            console.log('SEO data found:', {
              metaDescription: parsed.article.seo_critical.meta_description?.substring(0, 100) + '...'
            });
          }

          if (parsed.article.featured_image) {
            console.log('Featured image found:', {
              aiPrompt: parsed.article.featured_image.ai_prompt?.substring(0, 100) + '...'
            });
          }
        }

        // NOW DO THE ACTUAL EXTRACTION
        console.log('\n🎯 EXTRACTING CLEAN DATA:');

        const extractedData = {
          title: parsed.article.basic_data.title,
          content: parsed.article.content,
          slug: parsed.article.basic_data.slug,
          meta_description: parsed.article.seo_critical?.meta_description,
          tags: parsed.article.basic_data?.tags || [],
          ai_image_prompt: parsed.article.featured_image?.ai_prompt
        };

        console.log('✅ Successfully extracted:', {
          title: extractedData.title,
          contentLength: extractedData.content.length,
          slug: extractedData.slug,
          metaDescriptionLength: extractedData.meta_description?.length || 0,
          tagsCount: extractedData.tags.length,
          hasImagePrompt: !!extractedData.ai_image_prompt
        });

        // Now let's actually update the article directly via API call
        console.log('\n🚀 ATTEMPTING DIRECT UPDATE:');

        const updateResponse = await fetch(`https://autogeorge.vercel.app/api/admin/articles/${articleId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'manual-fix',
            extractedData: extractedData
          })
        });

        const updateResult = await updateResponse.json();
        console.log('Update result:', updateResult);

      } catch (parseError) {
        console.log('❌ JSON parsing failed:', parseError.message);
        console.log('Content that failed to parse:', article.content.substring(0, 500) + '...');
      }
    }

  } catch (error) {
    console.log('💥 Analysis error:', error.message);
  }
}

// Run the analysis
analyzeCorruption().catch(console.error);