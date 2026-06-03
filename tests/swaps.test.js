const { describe, it, assert } = window.__test;

import { findSwaps } from '../js/engine/swaps.js';

describe('Swaps', () => {

  it('should suggest pantry substitutes for missing ingredients', () => {
    const missingIngredients = ['ing-cream'];
    const pantryItems = [
      { ingredientId: 'ing-greek-yogurt' },
      { ingredientId: 'ing-butter' }
    ];
    const allRecipeIngredients = [
      { ingredientId: 'ing-cream', name: 'cream', substitutes: ['greek yogurt', 'coconut cream'] }
    ];

    const result = findSwaps(missingIngredients, pantryItems, allRecipeIngredients);
    assert.equal(result.length, 1);
    assert.equal(result[0].missing, 'cream');
    assert.true(result[0].suggestions.length >= 1, 'Should have suggestions');
  });

  it('should mark substitute as inPantry when user has it', () => {
    const missingIngredients = ['ing-cream'];
    const pantryItems = [
      { ingredientId: 'ing-greek-yogurt' },
      { ingredientId: 'ing-coconut-cream' }
    ];
    const allRecipeIngredients = [
      { ingredientId: 'ing-cream', name: 'cream', substitutes: ['greek yogurt', 'coconut cream'] }
    ];

    const result = findSwaps(missingIngredients, pantryItems, allRecipeIngredients);
    const greekYogurt = result[0].suggestions.find(s => s.name === 'greek yogurt');
    assert.true(greekYogurt !== undefined, 'Greek yogurt should be suggested');
    assert.true(greekYogurt.inPantry, 'Greek yogurt should be marked as in pantry');
  });

  it('should mark substitute as not inPantry when user does not have it', () => {
    const missingIngredients = ['ing-cream'];
    const pantryItems = [{ ingredientId: 'ing-butter' }];
    const allRecipeIngredients = [
      { ingredientId: 'ing-cream', name: 'cream', substitutes: ['greek yogurt', 'coconut cream'] }
    ];

    const result = findSwaps(missingIngredients, pantryItems, allRecipeIngredients);
    for (const suggestion of result[0].suggestions) {
      assert.false(suggestion.inPantry, `${suggestion.name} should NOT be in pantry`);
    }
  });

  it('should handle ingredients with no substitutes', () => {
    const missingIngredients = ['ing-saffron'];
    const pantryItems = [{ ingredientId: 'ing-turmeric' }];
    const allRecipeIngredients = [
      { ingredientId: 'ing-saffron', name: 'saffron', substitutes: [] }
    ];

    const result = findSwaps(missingIngredients, pantryItems, allRecipeIngredients);
    assert.equal(result.length, 1);
    assert.equal(result[0].suggestions.length, 0, 'No substitutes available');
  });

  it('should handle multiple missing ingredients', () => {
    const missingIngredients = ['ing-cream', 'ing-butter'];
    const pantryItems = [{ ingredientId: 'ing-coconut-cream' }, { ingredientId: 'ing-olive-oil' }];
    const allRecipeIngredients = [
      { ingredientId: 'ing-cream', name: 'cream', substitutes: ['coconut cream'] },
      { ingredientId: 'ing-butter', name: 'butter', substitutes: ['olive oil', 'margarine'] }
    ];

    const result = findSwaps(missingIngredients, pantryItems, allRecipeIngredients);
    assert.equal(result.length, 2, 'Should have swaps for both missing items');

    const creamSwap = result.find(s => s.missing === 'cream');
    const butterSwap = result.find(s => s.missing === 'butter');
    assert.true(creamSwap !== undefined, 'Cream swap should exist');
    assert.true(butterSwap !== undefined, 'Butter swap should exist');
  });

});
