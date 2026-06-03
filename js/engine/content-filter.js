/**
 * @module content-filter
 * Content-based scoring: measures how well a recipe matches the user's pantry, preferences, and nutrition goals.
 */

/**
 * Risk weight mapping for urgency bonus calculation.
 * Higher weights for more urgent items incentivize using near-expiry ingredients.
 */
const RISK_WEIGHTS = {
  expired: 1.0,  // Still suggest using — user decides if it's truly expired
  high: 1.0,
  medium: 0.5,
  low: 0.1
};

/**
 * Score how well a recipe matches the user's pantry and preferences.
 *
 * @param {Object} recipe - Recipe object with ingredients, flavorProfile, and nutrition
 * @param {Array<Object>} pantryItems - User's pantry items with { ingredientId, riskLevel }
 * @param {Object} userProfile - User preferences
 * @param {string[]} userProfile.flavorPreferences - Preferred flavor profiles
 * @param {number|null} userProfile.calorieTarget - Target calories (null = no target)
 * @param {Object|null} userProfile.macroGoals - Target macros { protein, carbs, fat } (null = no goals)
 * @returns {Object} Scoring breakdown with ingredientMatch, urgencyBonus, flavorScore, nutritionScore, and tracking arrays
 */
export function scoreContentMatch(recipe, pantryItems, userProfile) {
  const recipeIngredientIds = recipe.ingredients.map(i => i.ingredientId);
  const pantryIds = new Set(pantryItems.map(p => p.ingredientId));
  const pantryRiskMap = new Map(pantryItems.map(p => [p.ingredientId, p.riskLevel]));
  const totalIngredients = recipeIngredientIds.length;

  // ─── Ingredient Match ───
  const matchedIngredients = recipeIngredientIds.filter(id => pantryIds.has(id));
  const missingIngredients = recipeIngredientIds.filter(id => !pantryIds.has(id));
  const ingredientMatch = totalIngredients > 0 ? matchedIngredients.length / totalIngredients : 0;

  // ─── Urgency Bonus — prioritize recipes that use at-risk pantry items ───
  const atRiskUsed = [];
  let urgencySum = 0;

  for (const id of matchedIngredients) {
    const risk = pantryRiskMap.get(id);
    const weight = RISK_WEIGHTS[risk] ?? 0;
    urgencySum += weight;

    // Track items that are genuinely at risk (not low)
    if (risk && risk !== 'low') {
      atRiskUsed.push(id);
    }
  }
  const urgencyBonus = totalIngredients > 0 ? urgencySum / totalIngredients : 0;

  // ─── Flavor Score — Jaccard-like overlap of flavor preferences ───
  const recipeFlavorSet = new Set(recipe.flavorProfile || []);
  const userFlavorSet = new Set(userProfile.flavorPreferences || []);
  const maxLen = Math.max(recipeFlavorSet.size, userFlavorSet.size);
  let flavorOverlap = 0;

  for (const flavor of recipeFlavorSet) {
    if (userFlavorSet.has(flavor)) flavorOverlap++;
  }
  const flavorScore = maxLen > 0 ? flavorOverlap / maxLen : 0;

  // ─── Nutrition Score — how well recipe matches calorie/macro targets ───
  const nutritionScore = computeNutritionScore(recipe.nutrition, userProfile);

  return {
    ingredientMatch,
    urgencyBonus,
    flavorScore,
    nutritionScore,
    matchedIngredients,
    missingIngredients,
    atRiskUsed
  };
}

/**
 * Compute a 0–1 score for how closely recipe nutrition matches user goals.
 * Returns 0.5 (neutral) when no targets are set.
 *
 * @param {Object} nutrition - Recipe nutrition { calories, protein, carbs, fat }
 * @param {Object} userProfile - User with optional calorieTarget and macroGoals
 * @returns {number} Nutrition match score 0–1
 */
function computeNutritionScore(nutrition, userProfile) {
  const { calorieTarget, macroGoals } = userProfile;

  // No targets set → neutral score
  if (!calorieTarget && !macroGoals) return 0.5;

  let scores = [];

  // Calorie proximity: 1.0 = exact match, decays as difference grows
  if (calorieTarget) {
    const calDiff = Math.abs(nutrition.calories - calorieTarget) / calorieTarget;
    scores.push(Math.max(0, 1 - calDiff));
  }

  // Macro proximity: average closeness of protein, carbs, fat to targets
  if (macroGoals) {
    const macros = ['protein', 'carbs', 'fat'];
    for (const macro of macros) {
      if (macroGoals[macro]) {
        const diff = Math.abs(nutrition[macro] - macroGoals[macro]) / macroGoals[macro];
        scores.push(Math.max(0, 1 - diff));
      }
    }
  }

  // Average all sub-scores
  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.5;
}
