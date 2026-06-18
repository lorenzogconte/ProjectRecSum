/**
 * Recipe Detail Modal Component
 *
 * Shows full recipe details with:
 * - Color-coded ingredient status (in pantry / at risk / missing)
 * - Pantry swap suggestions for missing items
 * - Nutrition breakdown
 * - Step-by-step instructions
 * - "Mark as Cooked" action
 */

const CUISINE_EMOJI = {
  'Italian': '🍝', 'Asian': '🍜', 'Mexican': '🌮', 'Middle Eastern': '🧆',
  'American': '🍔', 'Indian': '🍛', 'Breakfast': '🥞', 'Dessert': '🍰',
  'Mediterranean': '🫒', 'Japanese': '🍱', 'Thai': '🍲', 'French': '🥐',
};

const GRADIENT_BG = [
  'linear-gradient(135deg, #1a2332, #2d3748)',
  'linear-gradient(135deg, #2d1f30, #3d2748)',
  'linear-gradient(135deg, #1f2d1a, #2d4828)',
  'linear-gradient(135deg, #2d2a1a, #483d28)',
];

/**
 * Renders the recipe detail modal.
 * @param {HTMLElement} overlay - The modal overlay element.
 * @param {HTMLElement} modal - The modal content element.
 * @param {object} recommendation - The recommendation object { recipe, score, explanation, matchDetails }.
 * @param {object} store - The application store.
 */
export function renderRecipeDetail(overlay, modal, recommendation, store) {
  const { recipe, explanation, matchDetails } = recommendation;
  const emoji = CUISINE_EMOJI[recipe.cuisine] || '🍽️';
  const bgGradient = GRADIENT_BG[recipe.id.charCodeAt(4) % GRADIENT_BG.length];

  // Build ingredient status map for quick lookup
  const matchedSet = new Set(matchDetails.matched);
  const atRiskSet = new Set(matchDetails.atRiskUsed);
  const missingSet = new Set(matchDetails.missing);

  // Build swap lookup from matchDetails
  const swapMap = {};
  if (matchDetails.swaps) {
    matchDetails.swaps.forEach((swap) => {
      swapMap[swap.missing] = swap.suggestions || [];
    });
  }

  const { profile } = store.getState();
  const isSaved = profile.savedRecipes.includes(recipe.id);
  const isCooked = profile.cookedRecipes.includes(recipe.id);

  modal.innerHTML = `
    <div class="modal__header">
      <div class="modal__image" style="background: ${bgGradient}">
        <span>${emoji}</span>
      </div>
      <button class="modal__close" id="modal-close" aria-label="Close">✕</button>
    </div>

    <div class="modal__body">
      <h2 class="modal__title">${recipe.title}</h2>
      <span class="modal__cuisine">${recipe.cuisine}</span>
      <p class="modal__description">${recipe.description}</p>

      <!-- Meta info row -->
      <div class="modal__meta">
        <div class="modal__meta-item">
          <span class="modal__meta-value">⏱️ ${recipe.prepTime}</span>
          <span class="modal__meta-label">minutes</span>
        </div>
        <div class="modal__meta-item">
          <span class="modal__meta-value">📊 ${capitalize(recipe.difficulty)}</span>
          <span class="modal__meta-label">difficulty</span>
        </div>
        <div class="modal__meta-item">
          <span class="modal__meta-value">♥ ${recipe.cookCount}</span>
          <span class="modal__meta-label">cooked this</span>
        </div>
        <div class="modal__meta-item">
          <span class="modal__meta-value">★ ${recipe.communityRating.toFixed(1)}</span>
          <span class="modal__meta-label">rating</span>
        </div>
      </div>

      <!-- Explanation panel -->
      <div class="modal__explanation">
        <div class="modal__explanation-title">💡 Why This Recipe</div>
        <div class="modal__explanation-text">${explanation}</div>
      </div>

      <!-- Ingredients with status -->
      <h3 class="modal__section-title">🧾 Ingredients</h3>
      <ul class="modal__ingredients">
        ${recipe.ingredients.map((ing) => renderIngredient(ing, matchedSet, atRiskSet, missingSet, swapMap)).join('')}
      </ul>

      <!-- Nutrition -->
      <h3 class="modal__section-title">📊 Nutrition (per serving)</h3>
      <div class="modal__nutrition">
        <div class="nutrition-item">
          <div class="nutrition-item__value">${recipe.nutrition.calories}</div>
          <div class="nutrition-item__label">Calories</div>
        </div>
        <div class="nutrition-item">
          <div class="nutrition-item__value">${recipe.nutrition.protein}g</div>
          <div class="nutrition-item__label">Protein</div>
        </div>
        <div class="nutrition-item">
          <div class="nutrition-item__value">${recipe.nutrition.carbs}g</div>
          <div class="nutrition-item__label">Carbs</div>
        </div>
        <div class="nutrition-item">
          <div class="nutrition-item__value">${recipe.nutrition.fat}g</div>
          <div class="nutrition-item__label">Fat</div>
        </div>
        <div class="nutrition-item">
          <div class="nutrition-item__value">${recipe.nutrition.fiber}g</div>
          <div class="nutrition-item__label">Fiber</div>
        </div>
      </div>

      <!-- Instructions -->
      <h3 class="modal__section-title">📝 Instructions</h3>
      <ol class="modal__instructions">
        ${recipe.instructions.map((step, i) => `
          <li class="modal__step">
            <span class="modal__step-number">${i + 1}</span>
            <span class="modal__step-text">${step}</span>
          </li>
        `).join('')}
      </ol>
    </div>

    <div class="modal__footer">
      <button class="btn ${isSaved ? 'btn--primary' : 'btn--secondary'}" id="modal-save">
        ${isSaved ? '💚 Saved' : '🤍 Save Recipe'}
      </button>
      <button class="btn ${isCooked ? 'btn--secondary' : 'btn--primary'}" id="modal-cooked"
        ${isCooked ? 'disabled' : ''}>
        ${isCooked ? '✅ Already Cooked' : '🍳 Mark as Cooked'}
      </button>
    </div>
  `;

  // Open the modal
  overlay.classList.add('is-open');

  // Bind events
  bindModalEvents(overlay, modal, recipe, matchDetails, store);
}

function renderIngredient(ing, matchedSet, atRiskSet, missingSet, swapMap) {
  const name = ing.name;
  let statusClass = '';
  let statusIcon = '';

  if (atRiskSet.has(name)) {
    statusClass = 'modal__ingredient--at-risk';
    statusIcon = '⚠️';
  } else if (matchedSet.has(name)) {
    statusClass = 'modal__ingredient--in-pantry';
    statusIcon = '✅';
  } else if (missingSet.has(name)) {
    statusClass = 'modal__ingredient--missing';
    statusIcon = '❌';
  }

  // Swap suggestion for missing items
  let swapHtml = '';
  if (missingSet.has(name) && swapMap[name] && swapMap[name].length > 0) {
    const swapTexts = swapMap[name].map((s) => {
      const inPantry = s.inPantry ? ' <strong>(in your pantry!)</strong>' : '';
      return `${s.name}${inPantry}`;
    });
    swapHtml = `<div class="modal__swap-suggestion">🔄 Swap: ${swapTexts.join(' or ')}</div>`;
  }

  return `
    <li class="modal__ingredient ${statusClass}">
      <span class="modal__ingredient-status">${statusIcon}</span>
      <span class="modal__ingredient-name">${capitalize(name)}</span>
      <span class="modal__ingredient-amount">${ing.amount}</span>
    </li>
    ${swapHtml}
  `;
}

function bindModalEvents(overlay, modal, recipe, matchDetails, store) {
  // Close modal
  const closeBtn = modal.querySelector('#modal-close');
  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('is-open');
    store.dispatch({ type: 'HIDE_RECIPE_DETAIL' });
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('is-open');
      store.dispatch({ type: 'HIDE_RECIPE_DETAIL' });
    }
  });

  // Close on Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      overlay.classList.remove('is-open');
      store.dispatch({ type: 'HIDE_RECIPE_DETAIL' });
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Save/unsave
  const saveBtn = modal.querySelector('#modal-save');
  saveBtn.addEventListener('click', () => {
    const { profile } = store.getState();
    if (profile.savedRecipes.includes(recipe.id)) {
      store.dispatch({ type: 'UNSAVE_RECIPE', payload: recipe.id });
    } else {
      store.dispatch({ type: 'SAVE_RECIPE', payload: recipe.id });
    }
  });

  // Mark as cooked — removes used ingredients from pantry AND records the rescue.
  const cookedBtn = modal.querySelector('#modal-cooked');
  cookedBtn.addEventListener('click', () => {
    // matchDetails entries may be ingredient names or ingredientIds depending on
    // the engine, so resolve each token to the recipe's ingredient either way.
    const findIngredient = (token) =>
      recipe.ingredients.find(
        (ri) =>
          ri.ingredientId === token ||
          (typeof token === 'string' &&
            ri.name.toLowerCase() === token.toLowerCase())
      );

    // All matched (in-pantry) ingredients get consumed and removed.
    const usedIngredientIds = (matchDetails.matched || [])
      .map((token) => findIngredient(token))
      .filter(Boolean)
      .map((recIng) => recIng.ingredientId);

    // The "at-risk" subset is what we actually rescued from the bin. We report
    // their ids + estimated grams so the store can grow the savings bar.
    const atRiskIngredientIds = [];
    const gramsByIngredientId = {};
    (matchDetails.atRiskUsed || []).forEach((token) => {
      const recIng = findIngredient(token);
      if (!recIng) return;
      atRiskIngredientIds.push(recIng.ingredientId);
      gramsByIngredientId[recIng.ingredientId] = parseAmountToGrams(recIng.amount);
    });

    store.dispatch({
      type: 'MARK_COOKED',
      payload: { recipeId: recipe.id, usedIngredientIds, atRiskIngredientIds, gramsByIngredientId },
    });

    // Close modal after marking as cooked
    overlay.classList.remove('is-open');
    store.dispatch({ type: 'HIDE_RECIPE_DETAIL' });
  });
}

/**
 * Best-effort conversion of a recipe ingredient amount string to grams.
 * Only weight/volume amounts (g, kg, ml, l) can be converted; counts like
 * "3 cloves", "2 slices", "handful", or "to taste" return 0 (they still count
 * as a rescued item, just not toward the grams estimate). Volume is treated as
 * ~1 g/ml, which is a reasonable approximation for the watery/dairy items that
 * tend to go off first.
 *
 * @param {string} amount
 * @returns {number} grams (0 if not weight/volume based)
 */
function parseAmountToGrams(amount) {
  if (!amount || typeof amount !== 'string') return 0;
  const match = amount.match(/([\d.]+)\s*(kg|g|ml|l)\b/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return 0;
  switch (match[2].toLowerCase()) {
    case 'kg': return value * 1000;
    case 'l': return value * 1000;
    case 'ml': return value;
    case 'g':
    default: return value;
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Closes the recipe detail modal.
 */
export function closeRecipeDetail(overlay) {
  overlay.classList.remove('is-open');
}