/**
 * @module swaps
 * Ingredient swap suggestions: finds substitutes for missing recipe ingredients
 * and checks if any substitutes already exist in the user's pantry.
 */

import { INGREDIENTS } from '../data/ingredients.js';

/**
 * Build a lookup map from ingredient name (lowercase) to ingredient ID.
 * Used to check if a substitute name matches a pantry item.
 */
function buildNameToIdMap() {
  const map = new Map();
  for (const ing of INGREDIENTS) {
    map.set(ing.name.toLowerCase(), ing.id);
  }
  return map;
}

/**
 * Find swap suggestions for missing ingredients.
 * For each missing ingredient, looks at its substitutes array and checks
 * whether the user already has the substitute in their pantry.
 *
 * @param {string[]} missingIngredients - Array of ingredientIds that the user is missing
 * @param {Array<Object>} pantryItems - User's pantry items with { ingredientId }
 * @param {Array<Object>} allRecipeIngredients - All ingredient entries from the recipe
 *   Each entry: { ingredientId, name, substitutes: string[] }
 * @returns {Array<Object>} Swap suggestions:
 *   [{ missing: "ingredient name", suggestions: [{ name, inPantry: boolean }] }]
 */
export function findSwaps(missingIngredients, pantryItems, allRecipeIngredients) {
  const pantryIds = new Set(pantryItems.map(p => p.ingredientId));
  const nameToId = buildNameToIdMap();

  return missingIngredients.map(missingId => {
    // Find the recipe ingredient entry for this missing item
    const ingredientEntry = allRecipeIngredients.find(i => i.ingredientId === missingId);

    if (!ingredientEntry) {
      return { missing: missingId, suggestions: [] };
    }

    const substitutes = ingredientEntry.substitutes || [];

    const suggestions = substitutes.map(subName => {
      // Try to resolve substitute name to an ingredient ID
      const subId = nameToId.get(subName.toLowerCase());
      const inPantry = subId ? pantryIds.has(subId) : false;

      return { name: subName, inPantry };
    });

    return {
      missing: ingredientEntry.name,
      suggestions
    };
  });
}
