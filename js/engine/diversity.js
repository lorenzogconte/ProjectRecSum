/**
 * @module diversity
 * Diversity re-ranking to prevent filter bubbles and ensure variety in recommendations.
 * Two strategies: popularity tier balancing and cuisine diversity enforcement.
 */

/**
 * Re-rank scored recipes to ensure diversity in the top results.
 *
 * Strategy 1: If top-N has >60% "high" popularity tier, promote 2 "medium/low" recipes
 *   from positions beyond top-N that have good ingredient match scores.
 *
 * Strategy 2: Ensure at least 2 different cuisines appear in the top 5 results.
 *
 * @param {Array<Object>} scoredRecipes - Array of { recipe, score, matchDetails } sorted by score descending
 * @param {number} [topN=10] - Number of top results to optimize for diversity
 * @returns {Array<Object>} Re-ranked array (same length, just reordered)
 */
export function applyDiversityReranking(scoredRecipes, topN = 10) {
  if (scoredRecipes.length <= 1) return [...scoredRecipes];

  // Work with a shallow copy to avoid mutating the original
  let result = [...scoredRecipes];
  const effectiveN = Math.min(topN, result.length);

  // ─── Strategy 1: Popularity Tier Balancing ───
  result = balancePopularityTiers(result, effectiveN);

  // ─── Strategy 2: Cuisine Diversity in Top 5 ───
  result = enforceCuisineDiversity(result, effectiveN);

  return result;
}

/**
 * If the top-N is dominated by "high" popularity recipes (>60%),
 * promote up to 2 medium/low recipes with good ingredient match from beyond top-N.
 *
 * @param {Array<Object>} recipes - Scored recipes array
 * @param {number} effectiveN - Effective top-N count
 * @returns {Array<Object>} Rebalanced array
 */
function balancePopularityTiers(recipes, effectiveN) {
  const result = [...recipes];
  const topN = result.slice(0, effectiveN);
  const highCount = topN.filter(r => r.recipe.popularityTier === 'high').length;
  const highRatio = highCount / effectiveN;

  if (highRatio <= 0.6) return result;  // Already balanced

  // Find medium/low candidates from beyond top-N, sorted by ingredient match
  const candidates = result
    .slice(effectiveN)
    .filter(r => r.recipe.popularityTier !== 'high')
    .sort((a, b) => {
      const matchA = a.matchDetails?.ingredientMatch ?? a.score;
      const matchB = b.matchDetails?.ingredientMatch ?? b.score;
      return matchB - matchA;
    });

  // Promote up to 2 candidates into top-N (swap with lowest-scoring high-tier items)
  const promotionCount = Math.min(2, candidates.length);
  for (let promoted = 0; promoted < promotionCount; promoted++) {
    const candidate = candidates[promoted];
    const candidateIdx = result.indexOf(candidate);

    // Find the lowest-scoring "high" tier item in top-N to swap out
    let swapIdx = -1;
    let lowestScore = Infinity;
    for (let i = 0; i < effectiveN; i++) {
      if (result[i].recipe.popularityTier === 'high' && result[i].score < lowestScore) {
        lowestScore = result[i].score;
        swapIdx = i;
      }
    }

    if (swapIdx !== -1 && candidateIdx !== -1) {
      // Swap positions
      [result[swapIdx], result[candidateIdx]] = [result[candidateIdx], result[swapIdx]];
    }
  }

  return result;
}

/**
 * Ensure at least 2 different cuisines appear in the top 5 results.
 * If all top-5 are the same cuisine, swap in a different-cuisine recipe from below.
 *
 * @param {Array<Object>} recipes - Scored recipes array
 * @param {number} effectiveN - Effective top-N count
 * @returns {Array<Object>} Array with cuisine diversity enforced
 */
function enforceCuisineDiversity(recipes, effectiveN) {
  const result = [...recipes];
  const top5Count = Math.min(5, result.length);
  const top5Cuisines = new Set(result.slice(0, top5Count).map(r => r.recipe.cuisine));

  if (top5Cuisines.size >= 2) return result;  // Already diverse

  // Find the first recipe beyond top-5 with a different cuisine
  const dominantCuisine = result[0]?.recipe.cuisine;
  const candidateIdx = result.findIndex(
    (r, i) => i >= top5Count && r.recipe.cuisine !== dominantCuisine
  );

  if (candidateIdx === -1) return result;  // No different cuisine available

  // Move it to position 4 (5th spot), shifting others down
  const [candidate] = result.splice(candidateIdx, 1);
  result.splice(Math.min(4, top5Count - 1), 0, candidate);

  return result;
}
