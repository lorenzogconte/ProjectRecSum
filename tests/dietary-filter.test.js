const { describe, it, assert } = window.__test;

import { applyDietaryFilter } from '../js/engine/dietary-filter.js';

// ─── Mock recipes for testing ───
const mockRecipes = [
  {
    id: 'rec-t01',
    title: 'Grilled Chicken Salad',
    dietaryInfo: [],
    allergens: ['none'],
    ingredients: [{ ingredientId: 'ing-chicken', name: 'chicken' }]
  },
  {
    id: 'rec-t02',
    title: 'Veggie Pasta',
    dietaryInfo: ['vegetarian'],
    allergens: ['gluten'],
    ingredients: [{ ingredientId: 'ing-pasta', name: 'pasta' }]
  },
  {
    id: 'rec-t03',
    title: 'Vegan Stir Fry',
    dietaryInfo: ['vegan', 'vegetarian', 'gluten-free'],
    allergens: ['soy'],
    ingredients: [{ ingredientId: 'ing-tofu', name: 'tofu' }]
  },
  {
    id: 'rec-t04',
    title: 'Peanut Noodles',
    dietaryInfo: ['vegan', 'vegetarian'],
    allergens: ['peanuts', 'gluten'],
    ingredients: [{ ingredientId: 'ing-peanuts', name: 'peanuts' }]
  },
  {
    id: 'rec-t05',
    title: 'Cheese Omelette',
    dietaryInfo: ['vegetarian', 'gluten-free'],
    allergens: ['dairy', 'eggs'],
    ingredients: [{ ingredientId: 'ing-cheese', name: 'cheese' }]
  }
];

describe('DietaryFilter', () => {

  it('should return all recipes when user has no restrictions or allergies', () => {
    const user = { dietaryRestrictions: [], allergies: [] };
    const result = applyDietaryFilter(mockRecipes, user);
    assert.equal(result.length, 5, 'All 5 recipes should pass');
  });

  it('should exclude non-vegetarian recipes for vegetarian user', () => {
    const user = { dietaryRestrictions: ['vegetarian'], allergies: [] };
    const result = applyDietaryFilter(mockRecipes, user);
    // rec-t01 (Grilled Chicken) has no 'vegetarian' in dietaryInfo → excluded
    assert.equal(result.length, 4);
    const ids = result.map(r => r.id);
    assert.notIncludes(ids, 'rec-t01', 'Chicken recipe should be excluded');
    assert.includes(ids, 'rec-t02', 'Veggie Pasta should be included');
    assert.includes(ids, 'rec-t03', 'Vegan Stir Fry should be included');
  });

  it('should exclude recipes with allergens the user is allergic to', () => {
    const user = { dietaryRestrictions: [], allergies: ['peanuts'] };
    const result = applyDietaryFilter(mockRecipes, user);
    const ids = result.map(r => r.id);
    assert.notIncludes(ids, 'rec-t04', 'Peanut Noodles should be excluded');
    assert.equal(result.length, 4);
  });

  it('should combine dietary restrictions AND allergy filtering', () => {
    const user = { dietaryRestrictions: ['vegetarian'], allergies: ['dairy'] };
    const result = applyDietaryFilter(mockRecipes, user);
    const ids = result.map(r => r.id);
    // Excluded: rec-t01 (not vegetarian), rec-t05 (has dairy allergen)
    assert.notIncludes(ids, 'rec-t01', 'Chicken excluded by diet');
    assert.notIncludes(ids, 'rec-t05', 'Cheese Omelette excluded by dairy allergy');
    assert.equal(result.length, 3);
  });

  it('should exclude recipes for vegan user that are only vegetarian', () => {
    const user = { dietaryRestrictions: ['vegan'], allergies: [] };
    const result = applyDietaryFilter(mockRecipes, user);
    const ids = result.map(r => r.id);
    // Only rec-t03 and rec-t04 have 'vegan' in dietaryInfo
    assert.notIncludes(ids, 'rec-t01', 'Chicken excluded');
    assert.notIncludes(ids, 'rec-t02', 'Veggie Pasta excluded (only vegetarian)');
    assert.notIncludes(ids, 'rec-t05', 'Cheese Omelette excluded (only vegetarian)');
    assert.equal(result.length, 2);
  });

  it('should return empty array when no recipes match strict filters', () => {
    const user = { dietaryRestrictions: ['vegan'], allergies: ['soy', 'peanuts', 'gluten'] };
    const result = applyDietaryFilter(mockRecipes, user);
    assert.equal(result.length, 0, 'No recipes should survive strict filtering');
  });

});
