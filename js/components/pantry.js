/**
 * Pantry Manager Component
 *
 * Handles ingredient search (autocomplete), quick-add, expiry tracking,
 * and risk-level display. The pantry is the primary input that drives
 * the recommendation engine.
 */

import { calculateDaysUntilExpiry, calculateRiskLevel, estimateExpiryDate } from '../utils/helpers.js';
import { INGREDIENTS } from '../data/ingredients.js';

/** Category icons — used as a fallback when an ingredient has no specific emoji. */
const CATEGORY_ICONS = {
  produce: '🥬',
  dairy: '🧀',
  protein: '🥩',
  grain: '🌾',
  spice: '🧂',
  condiment: '🫙',
  other: '📦',
};

/** Per-ingredient emojis, keyed by canonical ingredient id. */
const INGREDIENT_EMOJI = {
  // Produce
  'ing-tomato': '🍅', 'ing-onion': '🧅', 'ing-garlic': '🧄', 'ing-bell-pepper': '🫑',
  'ing-spinach': '🥬', 'ing-broccoli': '🥦', 'ing-carrot': '🥕', 'ing-potato': '🥔',
  'ing-lemon': '🍋', 'ing-lime': '🍋', 'ing-avocado': '🥑', 'ing-cilantro': '🌿',
  'ing-basil': '🌿', 'ing-ginger': '🫚', 'ing-mushroom': '🍄', 'ing-zucchini': '🥒',
  'ing-corn': '🌽', 'ing-lettuce': '🥬', 'ing-banana': '🍌', 'ing-jalapeño': '🌶️',
  // Dairy
  'ing-milk': '🥛', 'ing-butter': '🧈', 'ing-cheese': '🧀', 'ing-parmesan': '🧀',
  'ing-cream': '🥛', 'ing-yogurt': '🥣', 'ing-greek-yogurt': '🥣', 'ing-mozzarella': '🧀',
  'ing-sour-cream': '🥣', 'ing-cream-cheese': '🧀', 'ing-feta': '🧀', 'ing-eggs': '🥚',
  // Protein
  'ing-chicken': '🍗', 'ing-ground-beef': '🥩', 'ing-beef': '🥩', 'ing-salmon': '🐟',
  'ing-shrimp': '🦐', 'ing-tofu': '🧊', 'ing-tempeh': '🧆', 'ing-chickpeas': '🫘',
  'ing-lentils': '🫘', 'ing-black-beans': '🫘', 'ing-bacon': '🥓', 'ing-ground-turkey': '🦃',
  'ing-tuna': '🐟', 'ing-peanuts': '🥜',
  // Grains
  'ing-pasta': '🍝', 'ing-rice': '🍚', 'ing-bread': '🍞', 'ing-flour': '🌾',
  'ing-tortilla': '🫓', 'ing-corn-tortilla': '🫓', 'ing-rice-noodles': '🍜', 'ing-oats': '🥣',
  'ing-couscous': '🌾', 'ing-panko': '🍞', 'ing-quinoa': '🌾', 'ing-pita': '🫓',
  'ing-naan': '🫓', 'ing-pizza-dough': '🍕',
  // Spices
  'ing-salt': '🧂', 'ing-black-pepper': '🧂', 'ing-cumin': '🧂', 'ing-paprika': '🌶️',
  'ing-chili-powder': '🌶️', 'ing-oregano': '🌿', 'ing-thyme': '🌿', 'ing-turmeric': '🟡',
  'ing-cinnamon': '🧂', 'ing-garam-masala': '🧂', 'ing-curry-powder': '🧂',
  'ing-red-pepper-flakes': '🌶️', 'ing-bay-leaf': '🌿', 'ing-coriander': '🧂',
  'ing-nutmeg': '🧂', 'ing-vanilla': '🍶', 'ing-cocoa-powder': '🍫', 'ing-baking-powder': '🧂',
  // Condiments
  'ing-olive-oil': '🫒', 'ing-soy-sauce': '🍶', 'ing-sesame-oil': '🍶', 'ing-vinegar': '🍶',
  'ing-honey': '🍯', 'ing-maple-syrup': '🍁', 'ing-tomato-paste': '🥫', 'ing-hot-sauce': '🌶️',
  'ing-mustard': '🫙', 'ing-ketchup': '🥫', 'ing-peanut-butter': '🥜', 'ing-tahini': '🥫',
  'ing-fish-sauce': '🍶', 'ing-coconut-milk': '🥥', 'ing-coconut-cream': '🥥',
  'ing-vegetable-broth': '🍲',
  // Other
  'ing-sugar': '🍬', 'ing-brown-sugar': '🍬', 'ing-chocolate-chips': '🍫',
  'ing-walnuts': '🌰', 'ing-almonds': '🌰', 'ing-oat-milk': '🥛',
};

/** Resolves the best emoji for an ingredient: specific first, then category, then box. */
function emojiFor(ingredientId, category) {
  return INGREDIENT_EMOJI[ingredientId] || CATEGORY_ICONS[category] || '📦';
}

/**
 * Renders the pantry panel into the container.
 * @param {HTMLElement} container - The pantry panel element.
 * @param {object} store - The application store instance.
 */
export function renderPantry(container, store) {
  let autocompleteIndex = -1; // Track keyboard navigation in dropdown

  function render() {
    const { pantry } = store.getState();

    container.innerHTML = `
      <div class="glass-card glass-card--elevated pantry-search-card">
        <div class="pantry-header">
          <h2 class="glass-card__title">📦 My Pantry</h2>
          <span class="pantry-count">${pantry.length} items</span>
        </div>

        <!-- Search with autocomplete -->
        <div class="input-group" id="pantry-search-group">
          <span class="input-group__icon">🔍</span>
          <input type="text" class="text-input" id="pantry-search"
            placeholder="Search ingredients to add..."
            autocomplete="off" aria-label="Search ingredients">
          <div class="autocomplete-dropdown" id="pantry-autocomplete"></div>
        </div>

        <!-- Action buttons -->
        <div class="pantry-actions" style="margin-top: var(--space-md);">
          <button class="btn btn--secondary btn--sm" id="btn-load-demo">🔄 Load Demo</button>
          <button class="btn btn--danger btn--sm" id="btn-clear-pantry" ${pantry.length === 0 ? 'disabled' : ''}>🗑️ Clear All</button>
        </div>
      </div>

      <!-- Pantry items list -->
      <div class="glass-card glass-card--elevated pantry-list-card" style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
        <h3 class="glass-card__title" style="font-size: var(--font-sm);">Ingredients</h3>
        <div class="pantry-items-list" id="pantry-items-list">
          ${pantry.length === 0
            ? renderEmptyState()
            : pantry.map(renderPantryItem).join('')
          }
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderEmptyState() {
    return `
      <div class="pantry-empty">
        <div class="pantry-empty__icon">🛒</div>
        <div class="pantry-empty__text">
          Your pantry is empty.<br>Search and add ingredients above, or load the demo pantry.
        </div>
      </div>
    `;
  }

  function renderPantryItem(item) {
    const icon = emojiFor(item.ingredientId, item.category);
    const days = calculateDaysUntilExpiry(item.expiryDate);
    const risk = calculateRiskLevel(days);
    const expiryText = formatExpiryText(days, risk);
    const estimatedTag = item.expirySource === 'estimated' ? '<span class="estimated-badge">(est.)</span>' : '';

    return `
      <div class="pantry-item" data-id="${item.id}">
        <span class="pantry-item__icon">${icon}</span>
        <div class="pantry-item__info">
          <div class="pantry-item__top">
            <div class="pantry-item__name" title="${item.name}">${item.name}</div>
            <button class="pantry-item__remove" data-id="${item.id}" title="Remove" aria-label="Remove ${item.name}">✕</button>
          </div>
          <div class="pantry-item__expiry">
            <span class="pantry-item__expiry-left">
              <span class="risk-badge risk-badge--${risk}">${expiryText}</span>
              ${estimatedTag}
            </span>
            <input type="date" class="pantry-item__date-input" value="${item.expiryDate || ''}"
              data-id="${item.id}" title="Set expiry date" aria-label="Expiry date for ${item.name}">
          </div>
        </div>
      </div>
    `;
  }

  function formatExpiryText(days, risk) {
    if (risk === 'expired') return '❌ Expired';
    if (days === 0) return '🔴 Today!';
    if (days === 1) return '🔴 Tomorrow';
    if (risk === 'high') return `🔴 ${days} days`;
    if (risk === 'medium') return `🟡 ${days} days`;
    return `🟢 ${days} days`;
  }

  function bindEvents() {
    const searchInput = container.querySelector('#pantry-search');
    const dropdown = container.querySelector('#pantry-autocomplete');

    // Autocomplete search
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      autocompleteIndex = -1;

      if (query.length < 1) {
        dropdown.classList.remove('is-open');
        return;
      }

      const { pantry } = store.getState();
      const pantryIngIds = new Set(pantry.map((p) => p.ingredientId));

      // Filter ingredients not already in pantry
      const matches = INGREDIENTS
        .filter((ing) =>
          ing.name.toLowerCase().includes(query) && !pantryIngIds.has(ing.id)
        )
        .slice(0, 8);

      if (matches.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-item" style="color: var(--text-muted);">No matching ingredients found</div>';
        dropdown.classList.add('is-open');
        return;
      }

      dropdown.innerHTML = matches.map((ing, i) => `
        <div class="autocomplete-item ${i === autocompleteIndex ? 'is-active' : ''}"
          data-ingredient-id="${ing.id}" data-index="${i}">
          <div>
            <span class="autocomplete-item__name">${emojiFor(ing.id, ing.category)} ${highlightMatch(ing.name, query)}</span>
            <span class="autocomplete-item__category">${ing.category}</span>
          </div>
          <span class="autocomplete-item__add">+ Quick Add</span>
        </div>
      `).join('');

      dropdown.classList.add('is-open');

      // Click to add
      dropdown.querySelectorAll('.autocomplete-item[data-ingredient-id]').forEach((item) => {
        item.addEventListener('click', () => {
          addIngredient(item.dataset.ingredientId);
          searchInput.value = '';
          dropdown.classList.remove('is-open');
        });
      });
    });

    // Keyboard navigation in dropdown
    searchInput.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.autocomplete-item[data-ingredient-id]');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        autocompleteIndex = Math.min(autocompleteIndex + 1, items.length - 1);
        updateActiveItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        autocompleteIndex = Math.max(autocompleteIndex - 1, 0);
        updateActiveItem(items);
      } else if (e.key === 'Enter' && autocompleteIndex >= 0) {
        e.preventDefault();
        const activeItem = items[autocompleteIndex];
        if (activeItem) {
          addIngredient(activeItem.dataset.ingredientId);
          searchInput.value = '';
          dropdown.classList.remove('is-open');
        }
      } else if (e.key === 'Escape') {
        dropdown.classList.remove('is-open');
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.querySelector('#pantry-search-group')?.contains(e.target)) {
        dropdown.classList.remove('is-open');
      }
    });

    // Remove item buttons
    container.querySelectorAll('.pantry-item__remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        store.dispatch({ type: 'REMOVE_PANTRY_ITEM', payload: btn.dataset.id });
      });
    });

    // Date change on expiry inputs
    container.querySelectorAll('.pantry-item__date-input').forEach((input) => {
      input.addEventListener('change', (e) => {
        store.dispatch({
          type: 'UPDATE_PANTRY_ITEM',
          payload: {
            id: e.target.dataset.id,
            expiryDate: e.target.value,
            expirySource: 'user',
          },
        });
      });
    });

    // Load demo pantry
    container.querySelector('#btn-load-demo')?.addEventListener('click', () => {
      loadDemoPantry(store);
    });

    // Clear pantry
    container.querySelector('#btn-clear-pantry')?.addEventListener('click', () => {
      store.dispatch({ type: 'CLEAR_PANTRY' });
    });
  }

  function updateActiveItem(items) {
    items.forEach((item, i) => {
      item.classList.toggle('is-active', i === autocompleteIndex);
    });
  }

  function addIngredient(ingredientId) {
    const ingredient = INGREDIENTS.find((ing) => ing.id === ingredientId);
    if (!ingredient) return;

    const today = new Date().toISOString().split('T')[0];
    const estimatedExpiry = estimateExpiryDate(ingredient.category, today);

    const pantryItem = {
      id: `pantry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ingredientId: ingredient.id,
      name: ingredient.name,
      category: ingredient.category,
      addedDate: today,
      expiryDate: estimatedExpiry,
      expirySource: 'estimated',
    };

    store.dispatch({ type: 'ADD_PANTRY_ITEM', payload: pantryItem });
  }

  // Highlight matching text in autocomplete
  function highlightMatch(text, query) {
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return text;
    return text.slice(0, idx) + '<strong>' + text.slice(idx, idx + query.length) + '</strong>' + text.slice(idx + query.length);
  }

  // Subscribe to state changes and re-render
  store.subscribe((newState, prevState) => {
    if (newState.pantry !== prevState.pantry) {
      render();
    }
  });

  render();
}

/**
 * Loads a pre-populated demo pantry with a mix of urgencies.
 * This ensures the app is immediately usable on first load.
 *
 * IMPORTANT: each entry references a *canonical* ingredient id from the
 * INGREDIENTS master DB. Name and category are pulled from that record so the
 * pantry item's ingredientId always matches the ids used in recipes.js. Do NOT
 * hand-write ids by slugifying display names (e.g. "Chicken Breast" is
 * `ing-chicken`, NOT `ing-chicken-breast`; "Tomatoes" is `ing-tomato`, NOT
 * `ing-tomatoes`) — a mismatch makes the item invisible to every recipe.
 */
export function loadDemoPantry(store) {
  const today = new Date();

  // Only the canonical id + how many days until expiry are specified here.
  const demoSpec = [
    { id: 'ing-chicken', daysOffset: 1 },     // high risk
    { id: 'ing-tomato', daysOffset: 2 },      // high risk
    { id: 'ing-eggs', daysOffset: 3 },        // high risk
    { id: 'ing-milk', daysOffset: 2 },        // high risk
    { id: 'ing-bell-pepper', daysOffset: 4 }, // medium risk
    { id: 'ing-cheese', daysOffset: 6 },      // medium risk
    { id: 'ing-onion', daysOffset: 8 },       // low risk
    { id: 'ing-garlic', daysOffset: 14 },     // low risk
    { id: 'ing-pasta', daysOffset: 60 },      // low risk
    { id: 'ing-rice', daysOffset: 90 },       // low risk
    { id: 'ing-olive-oil', daysOffset: 180 }, // low risk
    { id: 'ing-soy-sauce', daysOffset: 120 }, // low risk
  ];

  const pantryItems = demoSpec
    .map((spec) => {
      const ingredient = INGREDIENTS.find((ing) => ing.id === spec.id);
      if (!ingredient) {
        console.warn(`Demo pantry: unknown ingredient id "${spec.id}" — skipped`);
        return null;
      }

      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + spec.daysOffset);

      return {
        id: `pantry-demo-${ingredient.id}`,
        ingredientId: ingredient.id,            // canonical — matches recipes
        name: ingredient.name,                  // pulled from master DB
        category: ingredient.category,          // pulled from master DB
        addedDate: today.toISOString().split('T')[0],
        expiryDate: expiryDate.toISOString().split('T')[0],
        expirySource: 'user',
      };
    })
    .filter(Boolean);

  store.dispatch({ type: 'SET_PANTRY', payload: pantryItems });
}