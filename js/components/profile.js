/**
 * Profile Drawer Component
 *
 * Slide-out panel for editing dietary restrictions, flavor preferences,
 * nutritional goals, viewing cooking history, and managing saved recipes.
 * Changes are applied immediately and the recommendation engine re-runs.
 */

import { RECIPES } from '../data/recipes.js';

/** Recipe emoji by cuisine (mirrors recipe-card for visual consistency). */
const CUISINE_EMOJI = {
  Italian: '🍝',
  Asian: '🍜',
  Mexican: '🌮',
  'Middle Eastern': '🧆',
  American: '🍔',
  Indian: '🍛',
  Breakfast: '🥞',
  Dessert: '🍰',
  Mediterranean: '🫒',
  Japanese: '🍱',
  Thai: '🍲',
  French: '🥐',
};

/**
 * Basic escaping for text rendered inside template strings.
 * Keeps the component safer if recipe titles/descriptions ever come from user data.
 */
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return entities[char];
  });
}

/**
 * Renders the profile drawer.
 * @param {HTMLElement} drawerEl - The profile drawer element.
 * @param {HTMLElement} overlayEl - The overlay backdrop element.
 * @param {object} store - The application store.
 */
export function renderProfile(drawerEl, overlayEl, store) {
  function render() {
    const { profile } = store.getState();

    const calorieMin = profile.calorieTarget?.min ?? 300;
    const calorieMax = profile.calorieTarget?.max ?? 800;

    drawerEl.innerHTML = `
      <div class="profile-drawer__header">
        <h2 class="profile-drawer__title">⚙️ Profile Settings</h2>
        <button class="btn btn--ghost btn--icon" id="close-profile" aria-label="Close profile">✕</button>
      </div>

      <!-- Saved Recipes -->
      <div class="profile-section">
        <div class="profile-section__header">
          <h3 class="profile-section__title">💚 Saved Recipes</h3>
          <span class="profile-section__count">${profile.savedRecipes.length}</span>
        </div>
        ${renderSavedRecipes(profile.savedRecipes)}
      </div>

      <!-- Dietary Restrictions -->
      <div class="profile-section">
        <h3 class="profile-section__title">🛡️ Dietary Restrictions</h3>
        <p class="text-muted" style="font-size: var(--font-xs); margin-bottom: var(--space-md);">
          Hard constraints — recipes violating these are excluded entirely.
        </p>
        <div class="profile-tags">
          ${renderDietaryTags(profile.dietaryRestrictions)}
        </div>
      </div>

      <!-- Flavor Preferences -->
      <div class="profile-section">
        <h3 class="profile-section__title">🎨 Flavor Preferences</h3>
        <div class="profile-tags">
          ${renderFlavorTags(profile.flavorPreferences)}
        </div>
      </div>

      <!-- Calorie Goals -->
      <div class="profile-section">
        <h3 class="profile-section__title">🎯 Calorie Range</h3>
        <div class="onboarding__range-group">
          <div class="onboarding__range-row">
            <span class="onboarding__range-label">Min</span>
            <input type="range" class="onboarding__range-input" id="profile-cal-min"
              min="100" max="600" step="50" value="${calorieMin}">
            <span class="onboarding__range-value" id="profile-cal-min-val">${calorieMin} kcal</span>
          </div>

          <div class="onboarding__range-row">
            <span class="onboarding__range-label">Max</span>
            <input type="range" class="onboarding__range-input" id="profile-cal-max"
              min="400" max="1200" step="50" value="${calorieMax}">
            <span class="onboarding__range-value" id="profile-cal-max-val">${calorieMax} kcal</span>
          </div>
        </div>
      </div>

      <!-- Cooking History -->
      <div class="profile-section">
        <h3 class="profile-section__title">📖 Cooking History</h3>
        <p class="text-muted" style="font-size: var(--font-xs);">
          ${profile.cookedRecipes.length} recipes cooked ·
          ${profile.savedRecipes.length} saved ·
          ${Object.keys(profile.ratings).length} rated
        </p>

        ${profile.rescuedCount > 0 ? `
          <p class="text-accent" style="font-size: var(--font-xs); margin-top: var(--space-xs);">
            🌍 ${profile.rescuedCount} item${profile.rescuedCount !== 1 ? 's' : ''} saved from the bin${profile.rescuedGrams > 0 ? ` (≈ ${formatWeight(profile.rescuedGrams)})` : ''}
          </p>
        ` : ''}
      </div>

      <!-- Reset -->
      <div class="profile-section">
        <button class="btn btn--danger btn--sm" id="reset-profile">🔄 Reset All Data</button>
      </div>
    `;

    bindEvents();
  }

  function renderSavedRecipes(savedIds) {
    if (!savedIds || savedIds.length === 0) {
      return `
        <div class="saved-recipes-empty">
          <div class="saved-recipes-empty__icon">🤍</div>
          <div>
            <div class="saved-recipes-empty__title">No saved recipes yet</div>
            <div class="saved-recipes-empty__text">
              Tap Save on any recipe and it will appear here.
            </div>
          </div>
        </div>
      `;
    }

    const rows = savedIds.map((id) => {
      const recipe = RECIPES.find((r) => r.id === id);
      if (!recipe) return '';

      const emoji = CUISINE_EMOJI[recipe.cuisine] || '🍽️';
      const title = escapeHtml(recipe.title);
      const cuisine = escapeHtml(recipe.cuisine);
      const prepTime = Number(recipe.prepTime ?? 0);
      const rating = Number(recipe.communityRating ?? 0).toFixed(1);
      const safeId = escapeHtml(id);

      return `
        <article
          class="saved-recipe-card"
          data-recipe-id="${safeId}"
          role="button"
          tabindex="0"
          aria-label="Open ${title}"
        >
          <div class="saved-recipe-card__main">
            <div class="saved-recipe-card__emoji" aria-hidden="true">${emoji}</div>

            <div class="saved-recipe-card__info">
              <div class="saved-recipe-card__title" title="${title}">${title}</div>

              <div class="saved-recipe-card__meta">
                <span>${cuisine}</span>
                <span class="saved-recipe-card__dot">•</span>
                <span>${prepTime} min</span>
                <span class="saved-recipe-card__dot">•</span>
                <span class="saved-recipe-card__rating">★ ${rating}</span>
              </div>
            </div>
          </div>

          <div class="saved-recipe-card__actions">
            <button
              class="saved-recipe-card__open"
              data-open-recipe="${safeId}"
              title="Open recipe"
              aria-label="Open ${title}"
            >
              →
            </button>

            <button
              class="saved-recipe-card__remove"
              data-unsave="${safeId}"
              title="Remove from saved"
              aria-label="Remove ${title} from saved"
            >
              ×
            </button>
          </div>
        </article>
      `;
    }).join('');

    return `<div class="saved-recipes-list">${rows}</div>`;
  }

  function renderDietaryTags(restrictions = []) {
    const options = [
      { value: 'vegan', label: '🌱 Vegan' },
      { value: 'vegetarian', label: '🥚 Vegetarian' },
      { value: 'gluten-free', label: '🌾 Gluten-Free' },
      { value: 'dairy-free', label: '🥛 Dairy-Free' },
      { value: 'nut-free', label: '🥜 Nut-Free' },
    ];

    return options.map((opt) => `
      <button class="filter-chip ${restrictions.includes(opt.value) ? 'is-active' : ''}"
        data-dietary="${opt.value}">${opt.label}</button>
    `).join('');
  }

  function renderFlavorTags(prefs = []) {
    const options = [
      { value: 'sweet', label: '🍯 Sweet' },
      { value: 'savory', label: '🧀 Savory' },
      { value: 'spicy', label: '🌶️ Spicy' },
      { value: 'mild', label: '🍃 Mild' },
      { value: 'comfort', label: '🍲 Comfort' },
    ];

    return options.map((opt) => `
      <button class="filter-chip ${prefs.includes(opt.value) ? 'is-active' : ''}"
        data-flavor="${opt.value}">${opt.label}</button>
    `).join('');
  }

  function bindEvents() {
    // Close drawer
    drawerEl.querySelector('#close-profile')?.addEventListener('click', () => {
      closeDrawer();
    });

    // Avoid stacking duplicate overlay listeners after each re-render
    overlayEl.onclick = () => {
      closeDrawer();
    };

    // Saved recipe card: open detail modal
    drawerEl.querySelectorAll('.saved-recipe-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-unsave]')) return;
        if (e.target.closest('[data-open-recipe]')) return;

        openRecipe(card.dataset.recipeId);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();

        openRecipe(card.dataset.recipeId);
      });
    });

    // Arrow button: open recipe
    drawerEl.querySelectorAll('[data-open-recipe]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openRecipe(btn.dataset.openRecipe);
      });
    });

    // Remove / unsave button
    drawerEl.querySelectorAll('[data-unsave]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();

        store.dispatch({
          type: 'UNSAVE_RECIPE',
          payload: btn.dataset.unsave,
        });
      });
    });

    // Dietary toggles
    drawerEl.querySelectorAll('[data-dietary]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const { profile } = store.getState();
        const value = chip.dataset.dietary;
        const current = profile.dietaryRestrictions;

        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];

        store.dispatch({
          type: 'UPDATE_PROFILE',
          payload: { dietaryRestrictions: updated },
        });
      });
    });

    // Flavor toggles
    drawerEl.querySelectorAll('[data-flavor]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const { profile } = store.getState();
        const value = chip.dataset.flavor;
        const current = profile.flavorPreferences;

        const updated = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];

        store.dispatch({
          type: 'UPDATE_PROFILE',
          payload: { flavorPreferences: updated },
        });
      });
    });

    // Calorie sliders
    const calMin = drawerEl.querySelector('#profile-cal-min');
    const calMax = drawerEl.querySelector('#profile-cal-max');

    if (calMin) {
      calMin.addEventListener('change', (e) => {
        const { profile } = store.getState();

        store.dispatch({
          type: 'UPDATE_PROFILE',
          payload: {
            calorieTarget: {
              ...profile.calorieTarget,
              min: parseInt(e.target.value, 10),
            },
          },
        });
      });

      calMin.addEventListener('input', (e) => {
        drawerEl.querySelector('#profile-cal-min-val').textContent = `${e.target.value} kcal`;
      });
    }

    if (calMax) {
      calMax.addEventListener('change', (e) => {
        const { profile } = store.getState();

        store.dispatch({
          type: 'UPDATE_PROFILE',
          payload: {
            calorieTarget: {
              ...profile.calorieTarget,
              max: parseInt(e.target.value, 10),
            },
          },
        });
      });

      calMax.addEventListener('input', (e) => {
        drawerEl.querySelector('#profile-cal-max-val').textContent = `${e.target.value} kcal`;
      });
    }

    // Reset
    drawerEl.querySelector('#reset-profile')?.addEventListener('click', () => {
      const confirmed = window.confirm('Reset all saved recipes, preferences, ratings, and cooking history?');
      if (!confirmed) return;

      localStorage.clear();
      window.location.reload();
    });
  }

  function openRecipe(recipeId) {
    if (!recipeId) return;

    closeDrawer();

    store.dispatch({
      type: 'SHOW_RECIPE_DETAIL',
      payload: recipeId,
    });
  }

  function closeDrawer() {
    overlayEl.classList.remove('is-open');
    drawerEl.classList.remove('is-open');

    store.dispatch({ type: 'TOGGLE_PROFILE' });
  }

  /**
   * Opens the profile drawer.
   */
  function open() {
    overlayEl.classList.add('is-open');
    drawerEl.classList.add('is-open');

    // Re-render with latest state
    render();
  }

  // Subscribe to profile changes to re-render drawer if open
  store.subscribe((newState, prevState) => {
    if (newState.profile !== prevState.profile && drawerEl.classList.contains('is-open')) {
      render();
    }
  });

  return { open, render };
}

/** Formats grams into a readable weight: g below 1kg, otherwise kg. */
function formatWeight(grams) {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg.toFixed(kg >= 10 ? 0 : 1)} kg`;
  }

  return `${Math.round(grams)} g`;
}