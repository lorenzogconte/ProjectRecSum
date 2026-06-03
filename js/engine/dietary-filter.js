/**
 * @module dietary-filter
 * Safety-first filter that removes recipes violating dietary restrictions or containing allergens.
 */

/**
 * Filter recipes based on user dietary restrictions and allergies.
 * This is the FIRST phase of recommendation — safety must come first.
 *
 * @param {Array<Object>} recipes - Array of recipe objects
 * @param {Object} userProfile - User profile with dietary restrictions and allergies
 * @param {string[]} userProfile.dietaryRestrictions - Diets the user follows (e.g., ["vegetarian", "gluten-free"])
 * @param {string[]} userProfile.allergies - Allergens the user must avoid (e.g., ["peanuts", "dairy"])
 * @returns {Array<Object>} Filtered recipes that are safe for the user
 */
export function applyDietaryFilter(recipes, userProfile) {
  const { dietaryRestrictions = [], allergies = [] } = userProfile;

  return recipes.filter(recipe => {
    // Check dietary restrictions: recipe.dietaryInfo must include ALL user restrictions
    const meetsDiet = dietaryRestrictions.every(
      restriction => recipe.dietaryInfo.includes(restriction)
    );
    if (!meetsDiet) return false;

    // Check allergens: recipe.allergens must NOT contain ANY user allergy
    const isSafe = !allergies.some(
      allergy => recipe.allergens.includes(allergy)
    );
    return isSafe;
  });
}
