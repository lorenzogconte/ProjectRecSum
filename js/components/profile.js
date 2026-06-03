/**
 * Profile Drawer Component
 *
 * Slide-out panel for editing dietary restrictions, flavor preferences,
 * nutritional goals, and viewing cooking history. Changes are applied
 * immediately and the recommendation engine re-runs.
 */

/**
 * Renders the profile drawer.
 * @param {HTMLElement} drawerEl - The profile drawer element.
 * @param {HTMLElement} overlayEl - The overlay backdrop element.
 * @param {object} store - The application store.
 */
export function renderProfile(drawerEl, overlayEl, store) {
  function render() {
    const { profile } = store.getState();

    drawerEl.innerHTML = `
      <div class="profile-drawer__header">
        <h2 class="profile-drawer__title">⚙️ Profile Settings</h2>
        <button class="btn btn--ghost btn--icon" id="close-profile" aria-label="Close profile">✕</button>
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
              min="100" max="600" step="50" value="${profile.calorieTarget.min}">
            <span class="onboarding__range-value" id="profile-cal-min-val">${profile.calorieTarget.min} kcal</span>
          </div>
          <div class="onboarding__range-row">
            <span class="onboarding__range-label">Max</span>
            <input type="range" class="onboarding__range-input" id="profile-cal-max"
              min="400" max="1200" step="50" value="${profile.calorieTarget.max}">
            <span class="onboarding__range-value" id="profile-cal-max-val">${profile.calorieTarget.max} kcal</span>
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
      </div>

      <!-- Reset -->
      <div class="profile-section">
        <button class="btn btn--danger btn--sm" id="reset-profile">🔄 Reset All Data</button>
      </div>
    `;

    bindEvents();
  }

  function renderDietaryTags(restrictions) {
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

  function renderFlavorTags(prefs) {
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

    overlayEl.addEventListener('click', () => {
      closeDrawer();
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
          payload: { calorieTarget: { ...profile.calorieTarget, min: parseInt(e.target.value) } },
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
          payload: { calorieTarget: { ...profile.calorieTarget, max: parseInt(e.target.value) } },
        });
      });
      calMax.addEventListener('input', (e) => {
        drawerEl.querySelector('#profile-cal-max-val').textContent = `${e.target.value} kcal`;
      });
    }

    // Reset
    drawerEl.querySelector('#reset-profile')?.addEventListener('click', () => {
      localStorage.clear();
      window.location.reload();
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
    render(); // Re-render with latest state
  }

  // Subscribe to profile changes to re-render drawer if open
  store.subscribe((newState, prevState) => {
    if (newState.profile !== prevState.profile && drawerEl.classList.contains('is-open')) {
      render();
    }
  });

  return { open, render };
}
