const { describe, it, assert } = window.__test;

import { scoreCollaborative } from '../js/engine/collab-filter.js';

// ─── Mock data ───
const targetRecipe = { id: 'rec-target', communityRating: 4.5, totalRatings: 50, cookCount: 200, popularityTier: 'high' };
const unpopularRecipe = { id: 'rec-unpopular', communityRating: 3.0, totalRatings: 5, cookCount: 10, popularityTier: 'low' };
const unkownRecipe = { id: 'rec-unknown', communityRating: 0, totalRatings: 0, cookCount: 0, popularityTier: 'low' };

const communityUsers = [
  {
    id: 'sim-001',
    dietaryRestrictions: ['vegetarian'],
    flavorPreferences: ['savory', 'spicy'],
    cookedRecipes: ['rec-target', 'rec-003'],
    ratings: { 'rec-target': 5, 'rec-003': 4 }
  },
  {
    id: 'sim-002',
    dietaryRestrictions: ['vegetarian'],
    flavorPreferences: ['savory', 'mild'],
    cookedRecipes: ['rec-target', 'rec-005'],
    ratings: { 'rec-target': 4, 'rec-005': 3 }
  },
  {
    id: 'sim-003',
    dietaryRestrictions: ['vegan'],
    flavorPreferences: ['sweet', 'fruity'],
    cookedRecipes: ['rec-006', 'rec-007'],
    ratings: { 'rec-006': 5, 'rec-007': 3 }
  },
  {
    id: 'sim-004',
    dietaryRestrictions: [],
    flavorPreferences: ['umami', 'bold'],
    cookedRecipes: ['rec-008'],
    ratings: { 'rec-008': 2 }
  }
];

describe('CollaborativeFilter', () => {

  it('should give higher similarUserScore when similar users liked the recipe', () => {
    // User with vegetarian + savory preferences → similar to sim-001 and sim-002
    const user = {
      dietaryRestrictions: ['vegetarian'],
      flavorPreferences: ['savory', 'spicy'],
      cookedRecipes: ['rec-003']
    };

    const result = scoreCollaborative(targetRecipe, user, communityUsers);
    assert.greaterThan(result.similarUserScore, 0, 'Should have positive similar user score');
  });

  it('should give low similarUserScore when no similar users cooked the recipe', () => {
    const user = {
      dietaryRestrictions: [],
      flavorPreferences: ['sweet', 'fruity'],
      cookedRecipes: []
    };

    const result = scoreCollaborative(unkownRecipe, user, communityUsers);
    assert.equal(result.similarUserScore, 0, 'No similar users → 0 score');
  });

  it('should compute popularity score based on rating and cook count', () => {
    const user = {
      dietaryRestrictions: [],
      flavorPreferences: [],
      cookedRecipes: []
    };

    const popular = scoreCollaborative(targetRecipe, user, communityUsers);
    const unpopular = scoreCollaborative(unpopularRecipe, user, communityUsers);

    assert.greaterThan(popular.popularityScore, unpopular.popularityScore,
      'Higher-rated, more-cooked recipe should have higher popularity score');
  });

  it('should return scores between 0 and 1', () => {
    const user = {
      dietaryRestrictions: ['vegetarian'],
      flavorPreferences: ['savory'],
      cookedRecipes: ['rec-target']
    };

    const result = scoreCollaborative(targetRecipe, user, communityUsers);
    assert.true(result.similarUserScore >= 0 && result.similarUserScore <= 1, 'similarUserScore in [0,1]');
    assert.true(result.popularityScore >= 0 && result.popularityScore <= 1, 'popularityScore in [0,1]');
  });

  it('should handle empty community users gracefully', () => {
    const user = {
      dietaryRestrictions: ['vegetarian'],
      flavorPreferences: ['savory'],
      cookedRecipes: []
    };

    const result = scoreCollaborative(targetRecipe, user, []);
    assert.equal(result.similarUserScore, 0, 'No community → 0 similar user score');
  });

});
