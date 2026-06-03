/**
 * Filters Bar Component
 *
 * Dynamic filtering interface for taste, cook time, sorting,
 * and auto-applied dietary restrictions from the user profile.
 */

/**
 * Renders the filters bar.
 * @param {HTMLElement} container
 * @param {object} store
 */
export function renderFiltersBar(container, store) {
  function render() {
    const { filters, profile } = store.getState();

    container.innerHTML = `
      <div class="filters-bar">
        <!-- Taste filters -->
        <div class="filters-group">
          <span class="filters-group__label">Taste</span>
          ${renderTasteChips(filters.taste)}
        </div>

        <div class="filter-divider"></div>

        <!-- Time filters -->
        <div class="filters-group">
          <span class="filters-group__label">Time</span>
          <button class="filter-chip ${filters.maxTime === 15 ? 'is-active' : ''}" data-time="15">⚡ ≤15 min</button>
          <button class="filter-chip ${filters.maxTime === 30 ? 'is-active' : ''}" data-time="30">🕐 ≤30 min</button>
          <button class="filter-chip ${filters.maxTime === null ? 'is-active' : ''}" data-time="any">🍳 Any</button>
        </div>

        <div class="filter-divider"></div>

        <!-- Diet badges (auto-applied, read-only) -->
        ${profile.dietaryRestrictions.length > 0 ? `
          <div class="filters-group">
            <span class="filters-group__label">Diet</span>
            ${profile.dietaryRestrictions.map((d) => `
              <span class="filter-chip is-active filter-chip--diet" title="From your profile">🛡️ ${d}</span>
            `).join('')}
          </div>
          <div class="filter-divider"></div>
        ` : ''}

        <!-- Sort -->
        <div class="filters-group">
          <span class="filters-group__label">Sort</span>
          <select class="sort-select" id="sort-select" aria-label="Sort recipes by">
            <option value="bestMatch" ${filters.sortBy === 'bestMatch' ? 'selected' : ''}>🎯 Best Match</option>
            <option value="expiringFirst" ${filters.sortBy === 'expiringFirst' ? 'selected' : ''}>⏰ Expiring First</option>
            <option value="quickEasy" ${filters.sortBy === 'quickEasy' ? 'selected' : ''}>⚡ Quick & Easy</option>
            <option value="community" ${filters.sortBy === 'community' ? 'selected' : ''}>❤️ Community Favorites</option>
          </select>
        </div>

        <span class="results-count" id="results-count"></span>
      </div>
    `;

    bindEvents();
  }

  function renderTasteChips(activeTastes) {
    const tastes = [
      { value: 'sweet', icon: '🍯', label: 'Sweet' },
      { value: 'savory', icon: '🧀', label: 'Savory' },
      { value: 'spicy', icon: '🌶️', label: 'Spicy' },
      { value: 'comfort', icon: '🍲', label: 'Comfort' },
    ];

    return tastes.map((t) => `
      <button class="filter-chip ${activeTastes.includes(t.value) ? 'is-active' : ''}"
        data-taste="${t.value}">${t.icon} ${t.label}</button>
    `).join('');
  }

  function bindEvents() {
    // Taste toggles
    container.querySelectorAll('[data-taste]').forEach((chip) => {
      chip.addEventListener('click', () => {
        store.dispatch({ type: 'TOGGLE_TASTE_FILTER', payload: chip.dataset.taste });
      });
    });

    // Time filter
    container.querySelectorAll('[data-time]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const value = chip.dataset.time === 'any' ? null : parseInt(chip.dataset.time);
        store.dispatch({ type: 'SET_TIME_FILTER', payload: value });
      });
    });

    // Sort select
    container.querySelector('#sort-select')?.addEventListener('change', (e) => {
      store.dispatch({ type: 'SET_SORT', payload: e.target.value });
    });
  }

  // Subscribe and re-render on filter or profile changes
  store.subscribe((newState, prevState) => {
    if (newState.filters !== prevState.filters || newState.profile !== prevState.profile) {
      render();
    }
  });

  render();
}

/**
 * Updates the results count display.
 * Called by the app controller after recommendations are computed.
 * @param {number} count
 */
export function updateResultsCount(count) {
  const el = document.getElementById('results-count');
  if (el) {
    el.textContent = `${count} recipe${count !== 1 ? 's' : ''} found`;
  }
}
