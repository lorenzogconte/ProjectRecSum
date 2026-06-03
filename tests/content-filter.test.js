const { describe, it, assert } = window.__test;

import { scoreContentMatch } from '../js/engine/content-filter.js';

// ─── Mock data for content filter tests ───
const mockRecipe = {
  id: 'rec-t10',
  title: 'Test Recipe',
  ingredients: [
    { ingredientId: 'ing-tomato', name: 'tomatoes', category: 'produce' },
    { ingredientId: 'ing-onion', name: 'onion', category: 'produce' },
    { ingredientId: 'ing-garlic', name: 'garlic', category: 'produce' },
    { ingredientId: 'ing-pasta', name: 'pasta', category: 'grain' },
    { ingredientId: 'ing-olive-oil', name: 'olive oil', category: 'condiment' },
    { ingredientId: 'ing-basil', name: 'basil', category: 'produce' }
  ],
  flavorProfile: ['savory', 'herby'],
  nutrition: { calories: 450, protein: 15, carbs: 55, fat: 18, fiber: 5 }
};

const smallRecipe = {
  id: 'rec-t11',
  title: 'Simple Recipe',
  ingredients: [
    { ingredientId: 'ing-rice', name: 'rice', category: 'grain' },
    { ingredientId: 'ing-soy-sauce', name: 'soy sauce', category: 'condiment' }
  ],
  flavorProfile: ['savory', 'umami'],
  nutrition: { calories: 300, protein: 8, carbs: 60, fat: 2, fiber: 1 }
};

describe('ContentFilter', () => {

  it('should score higher when more pantry items match recipe ingredients', () => {
    const pantryFull = [
      { ingredientId: 'ing-tomato', riskLevel: 'low' },
      { ingredientId: 'ing-onion', riskLevel: 'low' },
      { ingredientId: 'ing-garlic', riskLevel: 'low' },
      { ingredientId: 'ing-pasta', riskLevel: 'low' },
      { ingredientId: 'ing-olive-oil', riskLevel: 'low' }
    ];
    const pantrySmall = [
      { ingredientId: 'ing-tomato', riskLevel: 'low' },
      { ingredientId: 'ing-pasta', riskLevel: 'low' }
    ];
    const user = { flavorPreferences: [], calorieTarget: null, macroGoals: null };

    const scoreFull = scoreContentMatch(mockRecipe, pantryFull, user);
    const scoreSmall = scoreContentMatch(mockRecipe, pantrySmall, user);

    assert.greaterThan(scoreFull.ingredientMatch, scoreSmall.ingredientMatch,
      '5/6 match should score higher than 2/6');
  });

  it('should provide urgency bonus for at-risk pantry items', () => {
    const pantryHighRisk = [
      { ingredientId: 'ing-tomato', riskLevel: 'high' },
      { ingredientId: 'ing-onion', riskLevel: 'high' },
      { ingredientId: 'ing-garlic', riskLevel: 'medium' }
    ];
    const pantryLowRisk = [
      { ingredientId: 'ing-tomato', riskLevel: 'low' },
      { ingredientId: 'ing-onion', riskLevel: 'low' },
      { ingredientId: 'ing-garlic', riskLevel: 'low' }
    ];
    const user = { flavorPreferences: [], calorieTarget: null, macroGoals: null };

    const highResult = scoreContentMatch(mockRecipe, pantryHighRisk, user);
    const lowResult = scoreContentMatch(mockRecipe, pantryLowRisk, user);

    assert.greaterThan(highResult.urgencyBonus, lowResult.urgencyBonus,
      'High-risk items should give larger urgency bonus');
  });

  it('should report matched and missing ingredients correctly', () => {
    const pantry = [
      { ingredientId: 'ing-tomato', riskLevel: 'low' },
      { ingredientId: 'ing-pasta', riskLevel: 'low' }
    ];
    const user = { flavorPreferences: [], calorieTarget: null, macroGoals: null };

    const result = scoreContentMatch(mockRecipe, pantry, user);

    assert.equal(result.matchedIngredients.length, 2, 'Should have 2 matched');
    assert.equal(result.missingIngredients.length, 4, 'Should have 4 missing');
    assert.includes(result.matchedIngredients, 'ing-tomato');
    assert.includes(result.missingIngredients, 'ing-basil');
  });

  it('should compute flavor score based on overlapping preferences', () => {
    const pantry = [{ ingredientId: 'ing-tomato', riskLevel: 'low' }];
    const userMatch = { flavorPreferences: ['savory', 'herby'], calorieTarget: null, macroGoals: null };
    const userNoMatch = { flavorPreferences: ['sweet', 'fruity'], calorieTarget: null, macroGoals: null };

    const resultMatch = scoreContentMatch(mockRecipe, pantry, userMatch);
    const resultNoMatch = scoreContentMatch(mockRecipe, pantry, userNoMatch);

    assert.greaterThan(resultMatch.flavorScore, resultNoMatch.flavorScore,
      'Matching flavor prefs should score higher');
    assert.equal(resultNoMatch.flavorScore, 0, 'No overlap → 0 flavor score');
  });

  it('should return 0.5 nutrition score when no calorie target set', () => {
    const pantry = [{ ingredientId: 'ing-tomato', riskLevel: 'low' }];
    const user = { flavorPreferences: [], calorieTarget: null, macroGoals: null };

    const result = scoreContentMatch(mockRecipe, pantry, user);
    assert.equal(result.nutritionScore, 0.5, 'Default nutrition score should be 0.5');
  });

  it('should track at-risk used ingredients', () => {
    const pantry = [
      { ingredientId: 'ing-tomato', riskLevel: 'high' },
      { ingredientId: 'ing-onion', riskLevel: 'expired' },
      { ingredientId: 'ing-pasta', riskLevel: 'low' }
    ];
    const user = { flavorPreferences: [], calorieTarget: null, macroGoals: null };

    const result = scoreContentMatch(mockRecipe, pantry, user);
    assert.includes(result.atRiskUsed, 'ing-tomato', 'High-risk tomato should be in atRiskUsed');
    assert.includes(result.atRiskUsed, 'ing-onion', 'Expired onion should be in atRiskUsed');
    assert.notIncludes(result.atRiskUsed, 'ing-pasta', 'Low-risk pasta should NOT be in atRiskUsed');
  });

});
