/**
 * Pantry Manager Component
 *
 * Handles ingredient search (autocomplete), quick-add, expiry tracking,
 * and risk-level display. The pantry is the primary input that drives
 * the recommendation engine.
 */

import { calculateDaysUntilExpiry, calculateRiskLevel, estimateExpiryDate } from '../utils/helpers.js';
import { INGREDIENTS } from '../data/ingredients.js';

/** Category icons for visual distinction */
const CATEGORY_ICONS = {
  produce: '🥬',
  dairy: '🧀',
  protein: '🥩',
  grain: '🌾',
  spice: '🧂',
  condiment: '🫙',
  other: '📦',
};

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
      <div class="glass-card glass-card--elevated">
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
      <div class="glass-card glass-card--elevated" style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
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
    const icon = CATEGORY_ICONS[item.category] || '📦';
    const days = calculateDaysUntilExpiry(item.expiryDate);
    const risk = calculateRiskLevel(days);
    const expiryText = formatExpiryText(days, risk);
    const estimatedTag = item.expirySource === 'estimated' ? '<span class="estimated-badge">(est.)</span>' : '';

    return `
      <div class="pantry-item" data-id="${item.id}">
        <span class="pantry-item__icon">${icon}</span>
        <div class="pantry-item__info">
          <div class="pantry-item__name">${item.name}</div>
          <div class="pantry-item__expiry">
            <span class="risk-badge risk-badge--${risk}">${expiryText}</span>
            ${estimatedTag}
          </div>
        </div>
        <input type="date" class="pantry-item__date-input" value="${item.expiryDate || ''}"
          data-id="${item.id}" title="Set expiry date" aria-label="Expiry date for ${item.name}">
        <button class="pantry-item__remove" data-id="${item.id}" title="Remove" aria-label="Remove ${item.name}">✕</button>
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
            <span class="autocomplete-item__name">${CATEGORY_ICONS[ing.category] || '📦'} ${highlightMatch(ing.name, query)}</span>
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
 * Loads a pre-populated demo pantry with ~10 items, some near expiry.
 * This ensures the app is immediately usable on first load.
 */
export function loadDemoPantry(store) {
  const today = new Date();

  const demoItems = [
    { ingredientId: 'ing-chicken-breast', name: 'Chicken Breast', category: 'protein', daysOffset: 1 },
    { ingredientId: 'ing-tomatoes', name: 'Tomatoes', category: 'produce', daysOffset: 2 },
    { ingredientId: 'ing-eggs', name: 'Eggs', category: 'protein', daysOffset: 3 },
    { ingredientId: 'ing-onion', name: 'Onion', category: 'produce', daysOffset: 8 },
    { ingredientId: 'ing-garlic', name: 'Garlic', category: 'produce', daysOffset: 14 },
    { ingredientId: 'ing-pasta', name: 'Pasta', category: 'grain', daysOffset: 60 },
    { ingredientId: 'ing-rice', name: 'Rice', category: 'grain', daysOffset: 90 },
    { ingredientId: 'ing-milk', name: 'Milk', category: 'dairy', daysOffset: 2 },
    { ingredientId: 'ing-bell-pepper', name: 'Bell Pepper', category: 'produce', daysOffset: 4 },
    { ingredientId: 'ing-cheese', name: 'Cheese', category: 'dairy', daysOffset: 6 },
    { ingredientId: 'ing-olive-oil', name: 'Olive Oil', category: 'condiment', daysOffset: 180 },
    { ingredientId: 'ing-soy-sauce', name: 'Soy Sauce', category: 'condiment', daysOffset: 120 },
  ];

  const pantryItems = demoItems.map((item) => {
    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() + item.daysOffset);

    return {
      id: `pantry-demo-${item.ingredientId}`,
      ingredientId: item.ingredientId,
      name: item.name,
      category: item.category,
      addedDate: today.toISOString().split('T')[0],
      expiryDate: expiryDate.toISOString().split('T')[0],
      expirySource: 'user',
    };
  });

  store.dispatch({ type: 'SET_PANTRY', payload: pantryItems });
}
