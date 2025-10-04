/**
 * Category Utilities
 *
 * Helper functions to determine the correct category for article publishing
 * based on source configuration and WordPress site settings.
 */

/**
 * Determines the correct category for an article based on priority:
 * 1. Source defaultCategory (highest priority)
 * 2. WordPress Site defaultCategory (fallback)
 * 3. Empty array (no category)
 *
 * @param sourceDefaultCategory - Category set in the source configuration
 * @param wordPressSiteDefaultCategory - Default category from WordPress site settings
 * @returns Array of category IDs/names for WordPress
 */
export function determineArticleCategories(
  sourceDefaultCategory?: string | null,
  wordPressSiteDefaultCategory?: string | null
): string[] {
  // Priority 1: Source category (if set and not empty)
  if (sourceDefaultCategory && sourceDefaultCategory.trim() !== '') {
    return [sourceDefaultCategory.trim()];
  }

  // Priority 2: WordPress site default category (fallback)
  if (wordPressSiteDefaultCategory && wordPressSiteDefaultCategory.trim() !== '') {
    return [wordPressSiteDefaultCategory.trim()];
  }

  // Priority 3: No category
  return [];
}

/**
 * Gets the category source for logging and debugging purposes
 *
 * @param sourceDefaultCategory - Category set in the source configuration
 * @param wordPressSiteDefaultCategory - Default category from WordPress site settings
 * @returns String describing where the category came from
 */
export function getCategorySource(
  sourceDefaultCategory?: string | null,
  wordPressSiteDefaultCategory?: string | null
): string {
  if (sourceDefaultCategory && sourceDefaultCategory.trim() !== '') {
    return `source (${sourceDefaultCategory})`;
  }

  if (wordPressSiteDefaultCategory && wordPressSiteDefaultCategory.trim() !== '') {
    return `wordpress-site (${wordPressSiteDefaultCategory})`;
  }

  return 'none';
}

/**
 * Validates if a category string is valid
 *
 * @param category - Category to validate
 * @returns true if valid, false otherwise
 */
export function isValidCategory(category?: string | null): boolean {
  return !!(category && category.trim() !== '');
}