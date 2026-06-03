/**
 * Node.js test runner for SmartBite — runs all test suites from the command line.
 * Usage: node --experimental-vm-modules tests/node-test-runner.mjs
 */

// ─── Simple assertion library ───
class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

const assert = {
  equal(actual, expected, msg = '') {
    if (actual !== expected) {
      throw new AssertionError(`${msg ? msg + ': ' : ''}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  deepEqual(actual, expected, msg = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new AssertionError(`${msg ? msg + ': ' : ''}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  true(value, msg = '') {
    if (value !== true) throw new AssertionError(`${msg ? msg + ': ' : ''}Expected true, got ${JSON.stringify(value)}`);
  },
  false(value, msg = '') {
    if (value !== false) throw new AssertionError(`${msg ? msg + ': ' : ''}Expected false, got ${JSON.stringify(value)}`);
  },
  throws(fn, msg = '') {
    try { fn(); } catch { return; }
    throw new AssertionError(`${msg ? msg + ': ' : ''}Expected function to throw`);
  },
  greaterThan(actual, expected, msg = '') {
    if (!(actual > expected)) throw new AssertionError(`${msg ? msg + ': ' : ''}Expected ${actual} > ${expected}`);
  },
  lessThanOrEqual(actual, expected, msg = '') {
    if (!(actual <= expected)) throw new AssertionError(`${msg ? msg + ': ' : ''}Expected ${actual} <= ${expected}`);
  },
  includes(arr, item, msg = '') {
    if (!Array.isArray(arr) || !arr.includes(item)) throw new AssertionError(`${msg ? msg + ': ' : ''}Expected array to include ${JSON.stringify(item)}`);
  },
  notIncludes(arr, item, msg = '') {
    if (Array.isArray(arr) && arr.includes(item)) throw new AssertionError(`${msg ? msg + ': ' : ''}Expected array NOT to include ${JSON.stringify(item)}`);
  }
};

// ─── Test Suite Runner ───
const suites = [];
let currentSuite = null;
let totalPass = 0;
let totalFail = 0;

function describe(name, fn) {
  currentSuite = { name, tests: [] };
  suites.push(currentSuite);
  fn();
  currentSuite = null;
}

function it(name, fn) {
  currentSuite.tests.push({ name, fn });
}

// Make available globally
globalThis.__test = { describe, it, assert };
// Also set on globalThis.window for compatibility with browser test files
globalThis.window = { __test: { describe, it, assert } };

// ─── Import modules under test ───
import { applyDietaryFilter } from '../js/engine/dietary-filter.js';
import { scoreContentMatch } from '../js/engine/content-filter.js';
import { scoreCollaborative } from '../js/engine/collab-filter.js';
import { applyDiversityReranking } from '../js/engine/diversity.js';
import { findSwaps } from '../js/engine/swaps.js';
import { getRecommendations } from '../js/engine/recommender.js';

// ─── Register test suites inline (duplicating test logic to avoid window.__test issues) ───

// === DIETARY FILTER TESTS ===
const mockRecipes = [
  { id: 'rec-t01', title: 'Grilled Chicken Salad', dietaryInfo: [], allergens: ['none'], ingredients: [{ ingredientId: 'ing-chicken', name: 'chicken' }] },
  { id: 'rec-t02', title: 'Veggie Pasta', dietaryInfo: ['vegetarian'], allergens: ['gluten'], ingredients: [{ ingredientId: 'ing-pasta', name: 'pasta' }] },
  { id: 'rec-t03', title: 'Vegan Stir Fry', dietaryInfo: ['vegan', 'vegetarian', 'gluten-free'], allergens: ['soy'], ingredients: [{ ingredientId: 'ing-tofu', name: 'tofu' }] },
  { id: 'rec-t04', title: 'Peanut Noodles', dietaryInfo: ['vegan', 'vegetarian'], allergens: ['peanuts', 'gluten'], ingredients: [{ ingredientId: 'ing-peanuts', name: 'peanuts' }] },
  { id: 'rec-t05', title: 'Cheese Omelette', dietaryInfo: ['vegetarian', 'gluten-free'], allergens: ['dairy', 'eggs'], ingredients: [{ ingredientId: 'ing-cheese', name: 'cheese' }] }
];

describe('DietaryFilter', () => {
  it('should return all recipes when user has no restrictions or allergies', () => {
    const result = applyDietaryFilter(mockRecipes, { dietaryRestrictions: [], allergies: [] });
    assert.equal(result.length, 5);
  });
  it('should exclude non-vegetarian recipes for vegetarian user', () => {
    const result = applyDietaryFilter(mockRecipes, { dietaryRestrictions: ['vegetarian'], allergies: [] });
    assert.equal(result.length, 4);
    assert.notIncludes(result.map(r => r.id), 'rec-t01');
  });
  it('should exclude recipes with user allergens', () => {
    const result = applyDietaryFilter(mockRecipes, { dietaryRestrictions: [], allergies: ['peanuts'] });
    assert.notIncludes(result.map(r => r.id), 'rec-t04');
    assert.equal(result.length, 4);
  });
  it('should combine dietary restrictions AND allergy filtering', () => {
    const result = applyDietaryFilter(mockRecipes, { dietaryRestrictions: ['vegetarian'], allergies: ['dairy'] });
    const ids = result.map(r => r.id);
    assert.notIncludes(ids, 'rec-t01');
    assert.notIncludes(ids, 'rec-t05');
    assert.equal(result.length, 3);
  });
  it('should exclude only-vegetarian recipes for vegan user', () => {
    const result = applyDietaryFilter(mockRecipes, { dietaryRestrictions: ['vegan'], allergies: [] });
    assert.equal(result.length, 2);
  });
  it('should return empty when no recipes match strict filters', () => {
    const result = applyDietaryFilter(mockRecipes, { dietaryRestrictions: ['vegan'], allergies: ['soy', 'peanuts', 'gluten'] });
    assert.equal(result.length, 0);
  });
});

// === CONTENT FILTER TESTS ===
const contentRecipe = {
  id: 'rec-t10', title: 'Test Recipe',
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

describe('ContentFilter', () => {
  it('should score higher when more pantry items match', () => {
    const user = { flavorPreferences: [], calorieTarget: null, macroGoals: null };
    const full = scoreContentMatch(contentRecipe, [
      { ingredientId: 'ing-tomato', riskLevel: 'low' }, { ingredientId: 'ing-onion', riskLevel: 'low' },
      { ingredientId: 'ing-garlic', riskLevel: 'low' }, { ingredientId: 'ing-pasta', riskLevel: 'low' },
      { ingredientId: 'ing-olive-oil', riskLevel: 'low' }
    ], user);
    const small = scoreContentMatch(contentRecipe, [
      { ingredientId: 'ing-tomato', riskLevel: 'low' }, { ingredientId: 'ing-pasta', riskLevel: 'low' }
    ], user);
    assert.greaterThan(full.ingredientMatch, small.ingredientMatch);
  });
  it('should provide urgency bonus for at-risk items', () => {
    const user = { flavorPreferences: [], calorieTarget: null, macroGoals: null };
    const high = scoreContentMatch(contentRecipe, [
      { ingredientId: 'ing-tomato', riskLevel: 'high' }, { ingredientId: 'ing-onion', riskLevel: 'high' }, { ingredientId: 'ing-garlic', riskLevel: 'medium' }
    ], user);
    const low = scoreContentMatch(contentRecipe, [
      { ingredientId: 'ing-tomato', riskLevel: 'low' }, { ingredientId: 'ing-onion', riskLevel: 'low' }, { ingredientId: 'ing-garlic', riskLevel: 'low' }
    ], user);
    assert.greaterThan(high.urgencyBonus, low.urgencyBonus);
  });
  it('should report matched and missing correctly', () => {
    const user = { flavorPreferences: [], calorieTarget: null, macroGoals: null };
    const result = scoreContentMatch(contentRecipe, [
      { ingredientId: 'ing-tomato', riskLevel: 'low' }, { ingredientId: 'ing-pasta', riskLevel: 'low' }
    ], user);
    assert.equal(result.matchedIngredients.length, 2);
    assert.equal(result.missingIngredients.length, 4);
  });
  it('should compute flavor score from overlapping preferences', () => {
    const matchUser = { flavorPreferences: ['savory', 'herby'], calorieTarget: null, macroGoals: null };
    const noMatchUser = { flavorPreferences: ['sweet', 'fruity'], calorieTarget: null, macroGoals: null };
    const pantry = [{ ingredientId: 'ing-tomato', riskLevel: 'low' }];
    const m = scoreContentMatch(contentRecipe, pantry, matchUser);
    const n = scoreContentMatch(contentRecipe, pantry, noMatchUser);
    assert.greaterThan(m.flavorScore, n.flavorScore);
    assert.equal(n.flavorScore, 0);
  });
  it('should return 0.5 nutrition score when no target set', () => {
    const result = scoreContentMatch(contentRecipe, [{ ingredientId: 'ing-tomato', riskLevel: 'low' }],
      { flavorPreferences: [], calorieTarget: null, macroGoals: null });
    assert.equal(result.nutritionScore, 0.5);
  });
  it('should track at-risk used ingredients', () => {
    const result = scoreContentMatch(contentRecipe, [
      { ingredientId: 'ing-tomato', riskLevel: 'high' },
      { ingredientId: 'ing-onion', riskLevel: 'expired' },
      { ingredientId: 'ing-pasta', riskLevel: 'low' }
    ], { flavorPreferences: [], calorieTarget: null, macroGoals: null });
    assert.includes(result.atRiskUsed, 'ing-tomato');
    assert.includes(result.atRiskUsed, 'ing-onion');
    assert.notIncludes(result.atRiskUsed, 'ing-pasta');
  });
});

// === COLLABORATIVE FILTER TESTS ===
const targetRecipe = { id: 'rec-target', communityRating: 4.5, totalRatings: 50, cookCount: 200, popularityTier: 'high' };
const unpopularRecipe = { id: 'rec-unpopular', communityRating: 3.0, totalRatings: 5, cookCount: 10, popularityTier: 'low' };
const unknownRecipe = { id: 'rec-unknown', communityRating: 0, totalRatings: 0, cookCount: 0, popularityTier: 'low' };
const commUsers = [
  { id: 'sim-001', dietaryRestrictions: ['vegetarian'], flavorPreferences: ['savory', 'spicy'], cookedRecipes: ['rec-target', 'rec-003'], ratings: { 'rec-target': 5, 'rec-003': 4 } },
  { id: 'sim-002', dietaryRestrictions: ['vegetarian'], flavorPreferences: ['savory', 'mild'], cookedRecipes: ['rec-target', 'rec-005'], ratings: { 'rec-target': 4, 'rec-005': 3 } },
  { id: 'sim-003', dietaryRestrictions: ['vegan'], flavorPreferences: ['sweet', 'fruity'], cookedRecipes: ['rec-006', 'rec-007'], ratings: { 'rec-006': 5, 'rec-007': 3 } },
  { id: 'sim-004', dietaryRestrictions: [], flavorPreferences: ['umami', 'bold'], cookedRecipes: ['rec-008'], ratings: { 'rec-008': 2 } }
];

describe('CollaborativeFilter', () => {
  it('should give higher similarUserScore when similar users liked the recipe', () => {
    const user = { dietaryRestrictions: ['vegetarian'], flavorPreferences: ['savory', 'spicy'], cookedRecipes: ['rec-003'] };
    const result = scoreCollaborative(targetRecipe, user, commUsers);
    assert.greaterThan(result.similarUserScore, 0);
  });
  it('should give 0 similarUserScore when no similar users cooked the recipe', () => {
    const user = { dietaryRestrictions: [], flavorPreferences: ['sweet', 'fruity'], cookedRecipes: [] };
    const result = scoreCollaborative(unknownRecipe, user, commUsers);
    assert.equal(result.similarUserScore, 0);
  });
  it('should compute popularity score based on rating and cook count', () => {
    const user = { dietaryRestrictions: [], flavorPreferences: [], cookedRecipes: [] };
    const pop = scoreCollaborative(targetRecipe, user, commUsers);
    const unpop = scoreCollaborative(unpopularRecipe, user, commUsers);
    assert.greaterThan(pop.popularityScore, unpop.popularityScore);
  });
  it('should return scores between 0 and 1', () => {
    const user = { dietaryRestrictions: ['vegetarian'], flavorPreferences: ['savory'], cookedRecipes: ['rec-target'] };
    const result = scoreCollaborative(targetRecipe, user, commUsers);
    assert.true(result.similarUserScore >= 0 && result.similarUserScore <= 1);
    assert.true(result.popularityScore >= 0 && result.popularityScore <= 1);
  });
  it('should handle empty community gracefully', () => {
    const user = { dietaryRestrictions: ['vegetarian'], flavorPreferences: ['savory'], cookedRecipes: [] };
    const result = scoreCollaborative(targetRecipe, user, []);
    assert.equal(result.similarUserScore, 0);
  });
});

// === DIVERSITY TESTS ===
function makeScoredRecipe(id, score, cuisine, popularityTier, ingredientMatch = 0.5) {
  return { recipe: { id, cuisine, popularityTier }, score, matchDetails: { ingredientMatch } };
}

describe('DiversityReranking', () => {
  it('should promote medium/low recipes when top-N is >60% high tier', () => {
    const recipes = [
      makeScoredRecipe('r1', 0.95, 'Italian', 'high'), makeScoredRecipe('r2', 0.93, 'Asian', 'high'),
      makeScoredRecipe('r3', 0.91, 'Mexican', 'high'), makeScoredRecipe('r4', 0.89, 'Italian', 'high'),
      makeScoredRecipe('r5', 0.87, 'Asian', 'high'), makeScoredRecipe('r6', 0.85, 'Italian', 'high'),
      makeScoredRecipe('r7', 0.83, 'Asian', 'high'), makeScoredRecipe('r8', 0.81, 'Mexican', 'high'),
      makeScoredRecipe('r9', 0.79, 'Italian', 'medium'), makeScoredRecipe('r10', 0.77, 'Asian', 'medium'),
      makeScoredRecipe('r11', 0.75, 'Indian', 'low', 0.8), makeScoredRecipe('r12', 0.73, 'Middle Eastern', 'medium', 0.7),
      makeScoredRecipe('r13', 0.71, 'American', 'low', 0.6)
    ];
    const result = applyDiversityReranking(recipes, 10);
    const top10Ids = result.slice(0, 10).map(r => r.recipe.id);
    const hasPromoted = top10Ids.includes('r11') || top10Ids.includes('r12') || top10Ids.includes('r13');
    assert.true(hasPromoted, 'At least one medium/low recipe should be promoted');
  });
  it('should ensure at least 2 different cuisines in top-5', () => {
    const recipes = [
      makeScoredRecipe('r1', 0.95, 'Italian', 'medium'), makeScoredRecipe('r2', 0.93, 'Italian', 'medium'),
      makeScoredRecipe('r3', 0.91, 'Italian', 'medium'), makeScoredRecipe('r4', 0.89, 'Italian', 'medium'),
      makeScoredRecipe('r5', 0.87, 'Italian', 'medium'), makeScoredRecipe('r6', 0.85, 'Asian', 'medium'),
      makeScoredRecipe('r7', 0.83, 'Mexican', 'medium'), makeScoredRecipe('r8', 0.81, 'Indian', 'medium')
    ];
    const result = applyDiversityReranking(recipes, 10);
    const top5Cuisines = new Set(result.slice(0, 5).map(r => r.recipe.cuisine));
    assert.true(top5Cuisines.size >= 2);
  });
  it('should handle lists shorter than topN', () => {
    const recipes = [makeScoredRecipe('r1', 0.95, 'Italian', 'high'), makeScoredRecipe('r2', 0.93, 'Asian', 'high')];
    const result = applyDiversityReranking(recipes, 10);
    assert.equal(result.length, 2);
  });
  it('should preserve all recipes in output', () => {
    const recipes = Array.from({ length: 15 }, (_, i) =>
      makeScoredRecipe(`r${i + 1}`, 0.95 - i * 0.02, i % 2 === 0 ? 'Italian' : 'Asian', i < 10 ? 'high' : 'low', 0.6));
    const result = applyDiversityReranking(recipes, 10);
    assert.equal(result.length, 15);
  });
});

// === SWAPS TESTS ===
describe('Swaps', () => {
  it('should suggest pantry substitutes for missing ingredients', () => {
    const result = findSwaps(['ing-cream'], [{ ingredientId: 'ing-greek-yogurt' }],
      [{ ingredientId: 'ing-cream', name: 'cream', substitutes: ['greek yogurt', 'coconut cream'] }]);
    assert.equal(result.length, 1);
    assert.equal(result[0].missing, 'cream');
    assert.true(result[0].suggestions.length >= 1);
  });
  it('should mark substitute as inPantry when available', () => {
    const result = findSwaps(['ing-cream'], [{ ingredientId: 'ing-greek-yogurt' }, { ingredientId: 'ing-coconut-cream' }],
      [{ ingredientId: 'ing-cream', name: 'cream', substitutes: ['greek yogurt', 'coconut cream'] }]);
    const gy = result[0].suggestions.find(s => s.name === 'greek yogurt');
    assert.true(gy !== undefined);
    assert.true(gy.inPantry);
  });
  it('should mark substitute as not inPantry when unavailable', () => {
    const result = findSwaps(['ing-cream'], [{ ingredientId: 'ing-butter' }],
      [{ ingredientId: 'ing-cream', name: 'cream', substitutes: ['greek yogurt', 'coconut cream'] }]);
    for (const s of result[0].suggestions) assert.false(s.inPantry);
  });
  it('should handle no substitutes', () => {
    const result = findSwaps(['ing-saffron'], [{ ingredientId: 'ing-turmeric' }],
      [{ ingredientId: 'ing-saffron', name: 'saffron', substitutes: [] }]);
    assert.equal(result[0].suggestions.length, 0);
  });
  it('should handle multiple missing ingredients', () => {
    const result = findSwaps(['ing-cream', 'ing-butter'],
      [{ ingredientId: 'ing-coconut-cream' }, { ingredientId: 'ing-olive-oil' }],
      [{ ingredientId: 'ing-cream', name: 'cream', substitutes: ['coconut cream'] },
       { ingredientId: 'ing-butter', name: 'butter', substitutes: ['olive oil', 'margarine'] }]);
    assert.equal(result.length, 2);
  });
});

// === RECOMMENDER TESTS ===
const testRecipes = [
  {
    id: 'rec-int-01', title: 'Vegan Rice Bowl', cuisine: 'Asian', prepTime: 20, difficulty: 'easy',
    ingredients: [
      { ingredientId: 'ing-rice', name: 'rice', category: 'grain', substitutes: [] },
      { ingredientId: 'ing-tofu', name: 'tofu', category: 'protein', substitutes: ['tempeh'] },
      { ingredientId: 'ing-soy-sauce', name: 'soy sauce', category: 'condiment', substitutes: ['tamari'] },
      { ingredientId: 'ing-sesame-oil', name: 'sesame oil', category: 'condiment', substitutes: ['olive oil'] }
    ],
    tags: ['healthy', 'quick'], flavorProfile: ['savory', 'umami'],
    dietaryInfo: ['vegan', 'vegetarian', 'dairy-free'], allergens: ['soy'],
    nutrition: { calories: 380, protein: 14, carbs: 55, fat: 12, fiber: 4 },
    communityRating: 4.2, totalRatings: 30, cookCount: 150, popularityTier: 'medium',
    instructions: ['Cook rice', 'Fry tofu', 'Combine']
  },
  {
    id: 'rec-int-02', title: 'Grilled Steak', cuisine: 'American', prepTime: 25, difficulty: 'medium',
    ingredients: [
      { ingredientId: 'ing-beef', name: 'beef steak', category: 'protein', substitutes: [] },
      { ingredientId: 'ing-salt', name: 'salt', category: 'spice', substitutes: [] },
      { ingredientId: 'ing-black-pepper', name: 'black pepper', category: 'spice', substitutes: [] },
      { ingredientId: 'ing-butter', name: 'butter', category: 'dairy', substitutes: ['olive oil'] }
    ],
    tags: ['protein', 'dinner'], flavorProfile: ['savory', 'bold'],
    dietaryInfo: ['gluten-free'], allergens: ['dairy'],
    nutrition: { calories: 650, protein: 45, carbs: 0, fat: 48, fiber: 0 },
    communityRating: 4.7, totalRatings: 80, cookCount: 500, popularityTier: 'high',
    instructions: ['Season steak', 'Grill', 'Rest and serve']
  },
  {
    id: 'rec-int-03', title: 'Veggie Pasta', cuisine: 'Italian', prepTime: 20, difficulty: 'easy',
    ingredients: [
      { ingredientId: 'ing-pasta', name: 'pasta', category: 'grain', substitutes: ['rice noodles'] },
      { ingredientId: 'ing-tomato', name: 'tomatoes', category: 'produce', substitutes: [] },
      { ingredientId: 'ing-garlic', name: 'garlic', category: 'produce', substitutes: [] },
      { ingredientId: 'ing-olive-oil', name: 'olive oil', category: 'condiment', substitutes: [] },
      { ingredientId: 'ing-basil', name: 'basil', category: 'produce', substitutes: ['oregano'] }
    ],
    tags: ['comfort', 'quick'], flavorProfile: ['savory', 'herby'],
    dietaryInfo: ['vegan', 'vegetarian', 'dairy-free'], allergens: ['gluten'],
    nutrition: { calories: 420, protein: 12, carbs: 60, fat: 14, fiber: 5 },
    communityRating: 4.5, totalRatings: 60, cookCount: 300, popularityTier: 'high',
    instructions: ['Cook pasta', 'Make sauce', 'Combine']
  },
  {
    id: 'rec-int-04', title: 'Peanut Butter Smoothie', cuisine: 'American', prepTime: 5, difficulty: 'easy',
    ingredients: [
      { ingredientId: 'ing-peanut-butter', name: 'peanut butter', category: 'condiment', substitutes: ['almond butter'] },
      { ingredientId: 'ing-banana', name: 'banana', category: 'produce', substitutes: [] },
      { ingredientId: 'ing-milk', name: 'milk', category: 'dairy', substitutes: ['oat milk'] }
    ],
    tags: ['breakfast', 'quick'], flavorProfile: ['sweet', 'creamy'],
    dietaryInfo: ['vegetarian'], allergens: ['peanuts', 'dairy'],
    nutrition: { calories: 350, protein: 14, carbs: 40, fat: 16, fiber: 4 },
    communityRating: 4.0, totalRatings: 20, cookCount: 80, popularityTier: 'low',
    instructions: ['Blend all ingredients']
  }
];
const testCommunityUsers = [
  { id: 'sim-t01', dietaryRestrictions: ['vegetarian'], flavorPreferences: ['savory'], cookedRecipes: ['rec-int-01', 'rec-int-03'], ratings: { 'rec-int-01': 5, 'rec-int-03': 4 } },
  { id: 'sim-t02', dietaryRestrictions: [], flavorPreferences: ['bold', 'savory'], cookedRecipes: ['rec-int-02'], ratings: { 'rec-int-02': 5 } }
];

describe('Recommender (Full Pipeline)', () => {
  it('should exclude meat recipes for vegetarian user', () => {
    const results = getRecommendations(testRecipes,
      [{ ingredientId: 'ing-rice', riskLevel: 'low' }],
      { dietaryRestrictions: ['vegetarian'], allergies: [], flavorPreferences: ['savory'], cookedRecipes: [], calorieTarget: null, macroGoals: null },
      {}, testCommunityUsers);
    assert.notIncludes(results.map(r => r.recipe.id), 'rec-int-02');
  });
  it('should exclude peanut recipes for nut-allergy user', () => {
    const results = getRecommendations(testRecipes,
      [{ ingredientId: 'ing-rice', riskLevel: 'low' }],
      { dietaryRestrictions: [], allergies: ['peanuts'], flavorPreferences: [], cookedRecipes: [], calorieTarget: null, macroGoals: null },
      {}, testCommunityUsers);
    assert.notIncludes(results.map(r => r.recipe.id), 'rec-int-04');
  });
  it('should rank recipes with more matched ingredients higher', () => {
    const results = getRecommendations(testRecipes,
      [{ ingredientId: 'ing-pasta', riskLevel: 'low' }, { ingredientId: 'ing-tomato', riskLevel: 'low' },
       { ingredientId: 'ing-garlic', riskLevel: 'low' }, { ingredientId: 'ing-olive-oil', riskLevel: 'low' },
       { ingredientId: 'ing-basil', riskLevel: 'low' }],
      { dietaryRestrictions: [], allergies: [], flavorPreferences: ['savory'], cookedRecipes: [], calorieTarget: null, macroGoals: null },
      {}, testCommunityUsers);
    assert.equal(results[0].recipe.id, 'rec-int-03');
  });
  it('should produce explanations for each recipe', () => {
    const results = getRecommendations(testRecipes,
      [{ ingredientId: 'ing-rice', riskLevel: 'low' }],
      { dietaryRestrictions: [], allergies: [], flavorPreferences: [], cookedRecipes: [], calorieTarget: null, macroGoals: null },
      {}, testCommunityUsers);
    for (const r of results) {
      assert.true(typeof r.explanation === 'string' && r.explanation.length > 0);
    }
  });
  it('should include matchDetails', () => {
    const results = getRecommendations(testRecipes,
      [{ ingredientId: 'ing-rice', riskLevel: 'low' }, { ingredientId: 'ing-tofu', riskLevel: 'high' }],
      { dietaryRestrictions: [], allergies: [], flavorPreferences: [], cookedRecipes: [], calorieTarget: null, macroGoals: null },
      {}, testCommunityUsers);
    const rb = results.find(r => r.recipe.id === 'rec-int-01');
    assert.true(rb !== undefined);
    assert.true(Array.isArray(rb.matchDetails.matched));
    assert.true(Array.isArray(rb.matchDetails.missing));
    assert.true(Array.isArray(rb.matchDetails.swaps));
  });
  it('should filter by maxTime', () => {
    const results = getRecommendations(testRecipes,
      [{ ingredientId: 'ing-banana', riskLevel: 'low' }],
      { dietaryRestrictions: [], allergies: [], flavorPreferences: [], cookedRecipes: [], calorieTarget: null, macroGoals: null },
      { maxTime: 10 }, testCommunityUsers);
    for (const r of results) assert.lessThanOrEqual(r.recipe.prepTime, 10);
  });
});

// ─── Run all tests ───
console.log('\n🧪 SmartBite Test Runner\n');
for (const suite of suites) {
  console.log(`📦 ${suite.name}`);
  for (const test of suite.tests) {
    try {
      test.fn();
      totalPass++;
      console.log(`  ✅ ${test.name}`);
    } catch (e) {
      totalFail++;
      console.log(`  ❌ ${test.name}`);
      console.log(`     → ${e.message}`);
    }
  }
  console.log();
}

console.log(`\n${'═'.repeat(50)}`);
console.log(`Results: ${totalPass} passed, ${totalFail} failed, ${totalPass + totalFail} total`);
console.log(`${'═'.repeat(50)}\n`);

process.exit(totalFail > 0 ? 1 : 0);
