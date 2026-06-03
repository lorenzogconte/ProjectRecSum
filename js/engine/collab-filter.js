/**
 * @module collab-filter
 * Collaborative filtering: leverages community behavior to boost recipes liked by similar users.
 */

/**
 * Compute Jaccard similarity between two sets.
 * @param {Set} setA
 * @param {Set} setB
 * @returns {number} Jaccard index 0–1
 */
function jaccardIndex(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Compute a user similarity score based on dietary overlap, flavor overlap, and shared cooking history.
 *
 * @param {Object} userA - Current user profile
 * @param {Object} communityUser - Community user to compare against
 * @returns {number} Similarity score 0–1
 */
function computeUserSimilarity(userA, communityUser) {
  // Dietary similarity (weight 0.3)
  const dietA = new Set(userA.dietaryRestrictions || []);
  const dietB = new Set(communityUser.dietaryRestrictions || []);
  const dietSim = jaccardIndex(dietA, dietB);

  // Flavor preference similarity (weight 0.4)
  const flavorA = new Set(userA.flavorPreferences || []);
  const flavorB = new Set(communityUser.flavorPreferences || []);
  const flavorSim = jaccardIndex(flavorA, flavorB);

  // Cooking history overlap (weight 0.3)
  const cookedA = new Set(userA.cookedRecipes || []);
  const cookedB = new Set(communityUser.cookedRecipes || []);
  const cookedSim = jaccardIndex(cookedA, cookedB);

  return 0.3 * dietSim + 0.4 * flavorSim + 0.3 * cookedSim;
}

/**
 * Score a recipe collaboratively based on similar user behavior and overall popularity.
 *
 * @param {Object} recipe - Recipe object with communityRating, cookCount, popularityTier
 * @param {Object} userProfile - Current user with dietaryRestrictions, flavorPreferences, cookedRecipes
 * @param {Array<Object>} communityUsers - All community user profiles
 * @returns {Object} { similarUserScore: 0-1, popularityScore: 0-1 }
 */
export function scoreCollaborative(recipe, userProfile, communityUsers) {
  // ─── Similar User Score ───
  // Find users similar to the current user, then check if they rated this recipe highly
  const SIMILARITY_THRESHOLD = 0.15;
  let weightedRatingSum = 0;
  let totalSimilarity = 0;

  for (const communityUser of communityUsers) {
    const similarity = computeUserSimilarity(userProfile, communityUser);

    if (similarity >= SIMILARITY_THRESHOLD) {
      const rating = communityUser.ratings?.[recipe.id];
      if (rating !== undefined) {
        // Normalize rating to 0-1 (ratings are 1-5)
        weightedRatingSum += similarity * (rating / 5);
        totalSimilarity += similarity;
      }
    }
  }

  const similarUserScore = totalSimilarity > 0
    ? Math.min(1, weightedRatingSum / totalSimilarity)
    : 0;

  // ─── Popularity Score ───
  // Based on community rating weighted by engagement volume (log scale)
  const rating = recipe.communityRating || 0;
  const cookCount = recipe.cookCount || 0;

  // Raw popularity = rating * log(cookCount + 1), normalized to ~0-1 range
  // Max theoretical: 5 * log(1001) ≈ 34.5
  const rawPopularity = rating * Math.log(cookCount + 1);
  const maxPopularity = 5 * Math.log(1000);  // Practical ceiling
  const popularityScore = Math.min(1, rawPopularity / maxPopularity);

  return { similarUserScore, popularityScore };
}
