const { describe, it, assert } = window.__test;

import { getRecommendations } from '../js/engine/recommender.js';

// ─── Minimal recipe set for integration tests ───
const testRecipes = [
  {
    id: 'rec-int-01',
    title: 'Vegan Rice Bowl',
    cuisine: 'Asian',
    ingredients: [
      { ingredientId: 'ing-rice', name: 'rice', category: 'grain', substitutes: [] },
      { ingredientId: 'ing-tofu', name: 'tofu', category: 'protein', substitutes: ['tempeh'] },
      { ingredientId: 'ing-soy-sauce', name: 'soy sauce', category: 'condiment', substitutes: ['tamari'] },
      { ingredientId: 'ing-sesame-oil', name: 'sesame oil', category: 'condiment', substitutes: ['olive oil'] }
    ],
    prepTime: 20,
    difficulty: 'easy',
    tags: ['healthy', 'quick'],
    flavorProfile: ['savory', 'umami'],
    dietaryInfo: ['vegan', 'vegetarian', 'dairy-free'],
    allergens: ['soy'],
    nutrition: { calories: 380, protein: 14, carbs: 55, fat: 12, fiber: 4 },
    communityRating: 4.2,
    totalRatings: 30,
    cookCount: 150,
    popularityTier: 'medium',
    instructions: ['Cook rice', 'Fry tofu', 'Combine']
  },
  {
    id: 'rec-int-02',
    title: 'Grilled Steak',
    cuisine: 'American',
    ingredients: [
      { ingredientId: 'ing-beef', name: 'beef steak', category: 'protein', substitutes: [] },
      { ingredientId: 'ing-salt', name: 'salt', category: 'spice', substitutes: [] },
      { ingredientId: 'ing-black-pepper', name: 'black pepper', category: 'spice', substitutes: [] },
      { ingredientId: 'ing-butter', name: 'butter', category: 'dairy', substitutes: ['olive oil'] }
    ],
    prepTime: 25,
    difficulty: 'medium',
    tags: ['protein', 'dinner'],
    flavorProfile: ['savory', 'bold'],
    dietaryInfo: ['gluten-free'],
    allergens: ['dairy'],
    nutrition: { calories: 650, protein: 45, carbs: 0, fat: 48, fiber: 0 },
    communityRating: 4.7,
    totalRatings: 80,
    cookCount: 500,
    popularityTier: 'high',
    instructions: ['Season steak', 'Grill', 'Rest and serve']
  },
  {
    id: 'rec-int-03',
    title: 'Veggie Pasta',
    cuisine: 'Italian',
    ingredients: [
      { ingredientId: 'ing-pasta', name: 'pasta', category: 'grain', substitutes: ['rice noodles'] },
      { ingredientId: 'ing-tomato', name: 'tomatoes', category: 'produce', substitutes: [] },
      { ingredientId: 'ing-garlic', name: 'garlic', category: 'produce', substitutes: [] },
      { ingredientId: 'ing-olive-oil', name: 'olive oil', category: 'condiment', substitutes: [] },
      { ingredientId: 'ing-basil', name: 'basil', category: 'produce', substitutes: ['oregano'] }
    ],
    prepTime: 20,
    difficulty: 'easy',
    tags: ['comfort', 'quick'],
    flavorProfile: ['savory', 'herby'],
    dietaryInfo: ['vegan', 'vegetarian', 'dairy-free'],
    allergens: ['gluten'],
    nutrition: { calories: 420, protein: 12, carbs: 60, fat: 14, fiber: 5 },
    communityRating: 4.5,
    totalRatings: 60,
    cookCount: 300,
    popularityTier: 'high',
    instructions: ['Cook pasta', 'Make sauce', 'Combine']
  },
  {
    id: 'rec-int-04',
    title: 'Peanut Butter Smoothie',
    cuisine: 'American',
    ingredients: [
      { ingredientId: 'ing-peanut-butter', name: 'peanut butter', category: 'condiment', substitutes: ['almond butter'] },
      { ingredientId: 'ing-banana', name: 'banana', category: 'produce', substitutes: [] },
      { ingredientId: 'ing-milk', name: 'milk', category: 'dairy', substitutes: ['oat milk'] }
    ],
    prepTime: 5,
    difficulty: 'easy',
    tags: ['breakfast', 'quick'],
    flavorProfile: ['sweet', 'creamy'],
    dietaryInfo: ['vegetarian'],
    allergens: ['peanuts', 'dairy'],
    nutrition: { calories: 350, protein: 14, carbs: 40, fat: 16, fiber: 4 },
    communityRating: 4.0,
    totalRatings: 20,
    cookCount: 80,
    popularityTier: 'low',
    instructions: ['Blend all ingredients']
  }
];

const testCommunityUsers = [
  {
    id: 'sim-t01',
    dietaryRestrictions: ['vegetarian'],
    flavorPreferences: ['savory'],
    cookedRecipes: ['rec-int-01', 'rec-int-03'],
    ratings: { 'rec-int-01': 5, 'rec-int-03': 4 }
  },
  {
    id: 'sim-t02',
    dietaryRestrictions: [],
    flavorPreferences: ['bold', 'savory'],
    cookedRecipes: ['rec-int-02'],
    ratings: { 'rec-int-02': 5 }
  }
];

describe('Recommender (Full Pipeline)', () => {

  it('should exclude meat recipes for vegetarian user', () => {
    const pantry = [
      { ingredientId: 'ing-rice', riskLevel: 'low' },
      { ingredientId: 'ing-tofu', riskLevel: 'low' },
      { ingredientId: 'ing-pasta', riskLevel: 'low' }
    ];
    const user = {
      dietaryRestrictions: ['vegetarian'],
      allergies: [],
      flavorPreferences: ['savory'],
      cookedRecipes: [],
      calorieTarget: null,
      macroGoals: null
    };
    const filters = {};

    const results = getRecommendations(testRecipes, pantry, user, filters, testCommunityUsers);
    const ids = results.map(r => r.recipe.id);
    assert.notIncludes(ids, 'rec-int-02', 'Steak should be excluded for vegetarian');
  });

  it('should exclude peanut recipes for nut-allergy user', () => {
    const pantry = [{ ingredientId: 'ing-rice', riskLevel: 'low' }];
    const user = {
      dietaryRestrictions: [],
      allergies: ['peanuts'],
      flavorPreferences: [],
      cookedRecipes: [],
      calorieTarget: null,
      macroGoals: null
    };
    const filters = {};

    const results = getRecommendations(testRecipes, pantry, user, filters, testCommunityUsers);
    const ids = results.map(r => r.recipe.id);
    assert.notIncludes(ids, 'rec-int-04', 'Peanut smoothie should be excluded');
  });

  it('should rank recipes with more matched ingredients higher', () => {
    const pantry = [
      { ingredientId: 'ing-pasta', riskLevel: 'low' },
      { ingredientId: 'ing-tomato', riskLevel: 'low' },
      { ingredientId: 'ing-garlic', riskLevel: 'low' },
      { ingredientId: 'ing-olive-oil', riskLevel: 'low' },
      { ingredientId: 'ing-basil', riskLevel: 'low' }
    ];
    const user = {
      dietaryRestrictions: [],
      allergies: [],
      flavorPreferences: ['savory'],
      cookedRecipes: [],
      calorieTarget: null,
      macroGoals: null
    };
    const filters = {};

    const results = getRecommendations(testRecipes, pantry, user, filters, testCommunityUsers);
    // Veggie Pasta matches 5/5 ingredients → should rank first or very high
    assert.equal(results[0].recipe.id, 'rec-int-03', 'Veggie Pasta (5/5 match) should be top');
  });

  it('should produce explanations for each recommended recipe', () => {
    const pantry = [{ ingredientId: 'ing-rice', riskLevel: 'low' }];
    const user = {
      dietaryRestrictions: [],
      allergies: [],
      flavorPreferences: [],
      cookedRecipes: [],
      calorieTarget: null,
      macroGoals: null
    };
    const filters = {};

    const results = getRecommendations(testRecipes, pantry, user, filters, testCommunityUsers);
    for (const r of results) {
      assert.true(typeof r.explanation === 'string' && r.explanation.length > 0,
        `Recipe ${r.recipe.id} should have an explanation`);
    }
  });

  it('should include matchDetails with matched, missing, swaps arrays', () => {
    const pantry = [
      { ingredientId: 'ing-rice', riskLevel: 'low' },
      { ingredientId: 'ing-tofu', riskLevel: 'high' }
    ];
    const user = {
      dietaryRestrictions: [],
      allergies: [],
      flavorPreferences: [],
      cookedRecipes: [],
      calorieTarget: null,
      macroGoals: null
    };
    const filters = {};

    const results = getRecommendations(testRecipes, pantry, user, filters, testCommunityUsers);
    const riceBowl = results.find(r => r.recipe.id === 'rec-int-01');
    assert.true(riceBowl !== undefined, 'Rice bowl should be in results');
    assert.true(Array.isArray(riceBowl.matchDetails.matched), 'matched should be an array');
    assert.true(Array.isArray(riceBowl.matchDetails.missing), 'missing should be an array');
    assert.true(Array.isArray(riceBowl.matchDetails.swaps), 'swaps should be an array');
    assert.includes(riceBowl.matchDetails.matched, 'ing-rice');
  });

  it('should filter by maxTime when specified', () => {
    const pantry = [{ ingredientId: 'ing-banana', riskLevel: 'low' }];
    const user = {
      dietaryRestrictions: [],
      allergies: [],
      flavorPreferences: [],
      cookedRecipes: [],
      calorieTarget: null,
      macroGoals: null
    };
    const filters = { maxTime: 10 };

    const results = getRecommendations(testRecipes, pantry, user, filters, testCommunityUsers);
    // Only rec-int-04 has prepTime of 5
    for (const r of results) {
      assert.lessThanOrEqual(r.recipe.prepTime, 10, 'All results should be ≤10 min');
    }
  });

});
