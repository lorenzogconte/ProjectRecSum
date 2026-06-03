const { describe, it, assert } = window.__test;

import { applyDiversityReranking } from '../js/engine/diversity.js';

// ─── Helper to build scored recipes ───
function makeScoredRecipe(id, score, cuisine, popularityTier, ingredientMatch = 0.5) {
  return {
    recipe: { id, cuisine, popularityTier },
    score,
    matchDetails: { ingredientMatch }
  };
}

describe('DiversityReranking', () => {

  it('should promote medium/low popularity recipes when top-N is >60% high tier', () => {
    // Build a list where top-10 is 80% high popularity
    const scoredRecipes = [
      makeScoredRecipe('r1', 0.95, 'Italian', 'high'),
      makeScoredRecipe('r2', 0.93, 'Asian', 'high'),
      makeScoredRecipe('r3', 0.91, 'Mexican', 'high'),
      makeScoredRecipe('r4', 0.89, 'Italian', 'high'),
      makeScoredRecipe('r5', 0.87, 'Asian', 'high'),
      makeScoredRecipe('r6', 0.85, 'Italian', 'high'),
      makeScoredRecipe('r7', 0.83, 'Asian', 'high'),
      makeScoredRecipe('r8', 0.81, 'Mexican', 'high'),
      makeScoredRecipe('r9', 0.79, 'Italian', 'medium'),
      makeScoredRecipe('r10', 0.77, 'Asian', 'medium'),
      // Candidates below top-10 with good ingredient match
      makeScoredRecipe('r11', 0.75, 'Indian', 'low', 0.8),
      makeScoredRecipe('r12', 0.73, 'Middle Eastern', 'medium', 0.7),
      makeScoredRecipe('r13', 0.71, 'American', 'low', 0.6)
    ];

    const result = applyDiversityReranking(scoredRecipes, 10);
    const top10 = result.slice(0, 10);
    const top10Ids = top10.map(r => r.recipe.id);

    // At least one of the promoted medium/low recipes should be in top-10
    const hasPromoted = top10Ids.includes('r11') || top10Ids.includes('r12') || top10Ids.includes('r13');
    assert.true(hasPromoted, 'At least one medium/low recipe should be promoted into top-10');
  });

  it('should ensure at least 2 different cuisines in top-5', () => {
    const scoredRecipes = [
      makeScoredRecipe('r1', 0.95, 'Italian', 'medium'),
      makeScoredRecipe('r2', 0.93, 'Italian', 'medium'),
      makeScoredRecipe('r3', 0.91, 'Italian', 'medium'),
      makeScoredRecipe('r4', 0.89, 'Italian', 'medium'),
      makeScoredRecipe('r5', 0.87, 'Italian', 'medium'),
      makeScoredRecipe('r6', 0.85, 'Asian', 'medium'),
      makeScoredRecipe('r7', 0.83, 'Mexican', 'medium'),
      makeScoredRecipe('r8', 0.81, 'Indian', 'medium')
    ];

    const result = applyDiversityReranking(scoredRecipes, 10);
    const top5Cuisines = new Set(result.slice(0, 5).map(r => r.recipe.cuisine));
    assert.true(top5Cuisines.size >= 2, 'Top-5 should have at least 2 different cuisines');
  });

  it('should not modify ranking when diversity is already good', () => {
    const scoredRecipes = [
      makeScoredRecipe('r1', 0.95, 'Italian', 'medium'),
      makeScoredRecipe('r2', 0.93, 'Asian', 'low'),
      makeScoredRecipe('r3', 0.91, 'Mexican', 'high'),
      makeScoredRecipe('r4', 0.89, 'Indian', 'medium'),
      makeScoredRecipe('r5', 0.87, 'American', 'low'),
    ];

    const result = applyDiversityReranking(scoredRecipes, 5);
    // Already diverse — top IDs should remain the same
    assert.equal(result[0].recipe.id, 'r1');
    assert.equal(result[1].recipe.id, 'r2');
  });

  it('should handle lists shorter than topN gracefully', () => {
    const scoredRecipes = [
      makeScoredRecipe('r1', 0.95, 'Italian', 'high'),
      makeScoredRecipe('r2', 0.93, 'Asian', 'high')
    ];

    const result = applyDiversityReranking(scoredRecipes, 10);
    assert.equal(result.length, 2, 'Should return all available recipes');
  });

  it('should preserve all recipes in the output (just reorder)', () => {
    const scoredRecipes = Array.from({ length: 15 }, (_, i) =>
      makeScoredRecipe(`r${i + 1}`, 0.95 - i * 0.02, i % 2 === 0 ? 'Italian' : 'Asian', i < 10 ? 'high' : 'low', 0.6)
    );

    const result = applyDiversityReranking(scoredRecipes, 10);
    assert.equal(result.length, 15, 'All recipes should be preserved');
  });

});
