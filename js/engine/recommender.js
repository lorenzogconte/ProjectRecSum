/**
 * @module recommender
 * Main recommendation pipeline: orchestrates dietary filtering, content scoring,
 * collaborative scoring, diversity re-ranking, and swap suggestions.
 */

import { applyDietaryFilter } from './dietary-filter.js';
import { scoreContentMatch } from './content-filter.js';
import { scoreCollaborative } from './collab-filter.js';
import { applyDiversityReranking } from './diversity.js';
import { findSwaps } from './swaps.js';

/**
 * Scoring weights for the final composite score.
 * These weights determine relative importance of each scoring factor.
 */
const WEIGHTS = {
  ingredientMatch: 0.55,
  urgencyBonus: 0.25,
  flavorScore: 0.08,
  nutritionScore: 0.07,
  similarUserScore: 0.07,
  popularityScore: 0.03
};

/**
 * Generate a human-readable explanation based on the dominant scoring factor.
 *
 * @param {Object} contentScores - Content match scores
 * @param {Object} collabScores - Collaborative scores
 * @param {Object} recipe - Recipe object
 * @returns {string} Explanation string
 */
function generateExplanation(contentScores, collabScores, recipe) {
  // Find the dominant factor by weighted contribution
  const contributions = {
    'ingredient match': contentScores.ingredientMatch * WEIGHTS.ingredientMatch,
    'use-it-soon urgency': contentScores.urgencyBonus * WEIGHTS.urgencyBonus,
    'flavor preferences': contentScores.flavorScore * WEIGHTS.flavorScore,
    'nutrition goals': contentScores.nutritionScore * WEIGHTS.nutritionScore,
    'similar users': collabScores.similarUserScore * WEIGHTS.similarUserScore,
    'popularity': collabScores.popularityScore * WEIGHTS.popularityScore
  };

  const dominant = Object.entries(contributions)
    .sort((a, b) => b[1] - a[1])[0];

  const matchPct = Math.round(contentScores.ingredientMatch * 100);
  const missingCount = contentScores.missingIngredients.length;

  // Build contextual explanation
  const parts = [];

  if (dominant[0] === 'ingredient match') {
    parts.push(`You have ${matchPct}% of the ingredients`);
  } else if (dominant[0] === 'use-it-soon urgency') {
    const urgentNames = contentScores.atRiskUsed.length;
    parts.push(`Uses ${urgentNames} ingredient${urgentNames !== 1 ? 's' : ''} expiring soon`);
  } else if (dominant[0] === 'flavor preferences') {
    parts.push(`Matches your flavor preferences`);
  } else if (dominant[0] === 'similar users') {
    parts.push(`Loved by users with similar taste`);
  } else if (dominant[0] === 'popularity') {
    parts.push(`Popular in the community (★${recipe.communityRating})`);
  } else {
    parts.push(`Fits your nutrition goals`);
  }

  if (missingCount > 0 && missingCount <= 2) {
    parts.push(`only missing ${missingCount} ingredient${missingCount !== 1 ? 's' : ''}`);
  }

  return parts.join(' — ');
}

/**
 * Get ranked recipe recommendations through the full pipeline.
 *
 * Phase 1: Dietary filtering (safety)
 * Phase 2: Score each recipe (content + collaborative), apply active filters
 * Phase 3: Diversity re-ranking
 *
 * @param {Array<Object>} recipes - All available recipes
 * @param {Array<Object>} pantryItems - User's pantry items with { ingredientId, riskLevel }
 * @param {Object} userProfile - User profile with dietary, flavor, nutrition preferences
 * @param {Object} filters - Active UI filters
 * @param {string[]} [filters.taste] - Flavor filter values to boost
 * @param {number} [filters.maxTime] - Maximum prep time in minutes
 * @param {string} [filters.sortBy] - Sort field override
 * @param {Array<Object>} communityUsers - Community user profiles
 * @returns {Array<Object>} Ranked recommendations:
 *   [{ recipe, score, explanation, matchDetails: { matched, missing, atRiskUsed, swaps } }]
 */
export function getRecommendations(recipes, pantryItems, userProfile, filters = {}, communityUsers = []) {
  // ─── Phase 1: Safety Filter ───
  const safeRecipes = applyDietaryFilter(recipes, userProfile);

  // ─── Phase 2: Score Each Recipe ───
  let scoredRecipes = safeRecipes.map(recipe => {
    const contentScores = scoreContentMatch(recipe, pantryItems, userProfile);
    const collabScores = scoreCollaborative(recipe, userProfile, communityUsers);

    // Compute weighted final score
    let finalScore =
      contentScores.ingredientMatch * WEIGHTS.ingredientMatch +
      contentScores.urgencyBonus * WEIGHTS.urgencyBonus +
      contentScores.flavorScore * WEIGHTS.flavorScore +
      contentScores.nutritionScore * WEIGHTS.nutritionScore +
      collabScores.similarUserScore * WEIGHTS.similarUserScore +
      collabScores.popularityScore * WEIGHTS.popularityScore;

    // Apply taste filter boost
    if (filters.taste && filters.taste.length > 0) {
      const recipeFlavors = new Set(recipe.flavorProfile || []);
      const tasteOverlap = filters.taste.filter(t => recipeFlavors.has(t)).length;
      if (tasteOverlap > 0) {
        finalScore += 0.05 * tasteOverlap;  // Small boost per matching taste filter
      }
    }

    // Find swap suggestions for missing ingredients
    const swaps = findSwaps(
      contentScores.missingIngredients,
      pantryItems,
      recipe.ingredients
    );

    const explanation = generateExplanation(contentScores, collabScores, recipe);

    return {
      recipe,
      score: finalScore,
      explanation,
      matchDetails: {
        ingredientMatch: contentScores.ingredientMatch,
        urgencyBonus: contentScores.urgencyBonus,
        flavorScore: contentScores.flavorScore,
        nutritionScore: contentScores.nutritionScore,
        similarUserScore: collabScores.similarUserScore,
        popularityScore: collabScores.popularityScore,
        matched: contentScores.matchedIngredients,
        missing: contentScores.missingIngredients,
        atRiskUsed: contentScores.atRiskUsed,
        swaps
      }
    };
  });

  // ─── Apply Active Filters ───

  // ─── Apply Active Filters ───
  // Taste filter: temporary UI filter
  // Matches recipe.flavorProfile OR recipe.tags
  if (filters.taste && filters.taste.length > 0) {
    scoredRecipes = scoredRecipes.filter(r => {
      const recipeFlavors = r.recipe.flavorProfile || [];
      const recipeTags = r.recipe.tags || [];

      return filters.taste.some(taste =>
        recipeFlavors.includes(taste) || recipeTags.includes(taste)
      );
    });
  }

  // Time filter: exclude recipes exceeding maxTime
  if (filters.maxTime) {
    scoredRecipes = scoredRecipes.filter(r => r.recipe.prepTime <= filters.maxTime);
  }

 // Sort
  if (!filters.sortBy || filters.sortBy === 'best') {
    scoredRecipes.sort((a, b) => b.score - a.score);

    // Optional: disable this while debugging if order looks strange
    return applyDiversityReranking(scoredRecipes);
  }

  if (filters.sortBy === 'expiring') {
    scoredRecipes.sort((a, b) => {
      const urgencyDiff = b.matchDetails.urgencyBonus - a.matchDetails.urgencyBonus;
      if (urgencyDiff !== 0) return urgencyDiff;

      return b.matchDetails.ingredientMatch - a.matchDetails.ingredientMatch;
    });

    return scoredRecipes;
  }

  if (filters.sortBy === 'quick') {
    scoredRecipes.sort((a, b) => {
      const timeDiff = a.recipe.prepTime - b.recipe.prepTime;
      if (timeDiff !== 0) return timeDiff;

      return b.score - a.score;
    });

    return scoredRecipes;
  }

  if (filters.sortBy === 'community') {
    scoredRecipes.sort((a, b) => {
      const ratingDiff = b.recipe.communityRating - a.recipe.communityRating;
      if (ratingDiff !== 0) return ratingDiff;

      return b.recipe.cookCount - a.recipe.cookCount;
    });

    return scoredRecipes;
  }

  // fallback
  scoredRecipes.sort((a, b) => b.score - a.score);
  return scoredRecipes;

  return diverseResults;
}
