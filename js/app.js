/**
 * SmartBite — Main Application Controller
 *
 * Bootstraps the application: initializes store, renders components,
 * wires up the recommendation engine, and handles the core app loop.
 *
 * Architecture:
 * 1. Store holds all state (pantry, profile, filters, UI)
 * 2. Components subscribe to store changes and re-render
 * 3. Recommendation engine re-runs on pantry/profile/filter changes
 * 4. Results flow into recipe cards + waste gauge
 */

import { createStore } from './state/store.js';
import { RECIPES } from './data/recipes.js';
import { COMMUNITY_USERS } from './data/community.js';
import { getRecommendations } from './engine/recommender.js';
import { calculateDaysUntilExpiry, calculateRiskLevel } from './utils/helpers.js';

import { renderOnboarding } from './components/onboarding.js';
import { renderPantry, loadDemoPantry } from './components/pantry.js';
import { renderFiltersBar, updateResultsCount } from './components/filters-bar.js';
import { renderRecipeCards } from './components/recipe-card.js';
import { renderRecipeDetail } from './components/recipe-detail.js';
import { renderWasteGauge } from './components/waste-gauge.js';
import { renderProfile } from './components/profile.js';

/**
 * Application entry point.
 * Initializes all components and sets up the reactive rendering loop.
 */
function initApp() {
  // Create the application store (loads saved state from localStorage)
  const store = createStore();

  // Cache DOM references for all component containers
  const dom = {
    onboardingOverlay: document.getElementById('onboarding-overlay'),
    onboardingContainer: document.getElementById('onboarding-container'),
    pantryPanel: document.getElementById('pantry-panel'),
    filtersBar: document.getElementById('filters-bar-container'),
    recipeGrid: document.getElementById('recipe-grid'),
    communitySection: document.getElementById('community-section'),
    wasteGauge: document.getElementById('waste-gauge-container'),
    modalOverlay: document.getElementById('recipe-modal-overlay'),
    recipeModal: document.getElementById('recipe-modal'),
    profileOverlay: document.getElementById('profile-overlay'),
    profileDrawer: document.getElementById('profile-drawer'),
    profileBtn: document.getElementById('btn-profile'),
  };

  // Track current recommendations for detail modal lookup
  let currentRecommendations = [];

  // --- Onboarding ---
  const { profile } = store.getState();
  if (!profile.onboardingComplete) {
    showOnboarding(dom, store);
  } else {
    dom.onboardingOverlay.classList.add('is-hidden');
  }

  // --- Initialize Components ---
  renderPantry(dom.pantryPanel, store);
  renderFiltersBar(dom.filtersBar, store);

  const profileComponent = renderProfile(dom.profileDrawer, dom.profileOverlay, store);

  // Profile button opens the drawer
  dom.profileBtn.addEventListener('click', () => {
    profileComponent.open();
  });

  // --- Recommendation Engine Loop ---
  // Runs whenever pantry, profile, or filters change
  function runRecommendations() {
    const state = store.getState();
    const { pantry, profile: userProfile, filters } = state;

    // Attach a computed riskLevel to each pantry item so the engine can flag
    // at-risk (expiring) ingredients. The content filter reads `riskLevel` to
    // build `atRiskUsed`, which in turn drives the urgency bonus AND the
    // savings bar. Risk is derived from the expiry date at run time so it
    // always reflects the latest dates.
    const pantryWithRisk = pantry.map((item) => ({
      ...item,
      riskLevel: calculateRiskLevel(calculateDaysUntilExpiry(item.expiryDate)),
    }));

    // Run the recommendation engine
    currentRecommendations = getRecommendations(
      RECIPES,
      pantryWithRisk,
      userProfile,
      filters,
      COMMUNITY_USERS
    );

    // Render recipe cards
    renderRecipeCards(dom.recipeGrid, currentRecommendations, store);

    // Update results count
    updateResultsCount(currentRecommendations.length);

    // Update the savings bar from cumulative rescued food (driven by cooking)
    updateWasteGauge(dom.wasteGauge, userProfile);

    // Render community favorites section
    renderCommunityFavorites(dom.communitySection, currentRecommendations, store);
  }

  // Subscribe to state changes that affect recommendations
  store.subscribe((newState, prevState) => {
    const pantryChanged = newState.pantry !== prevState.pantry;
    const profileChanged = newState.profile !== prevState.profile;
    const filtersChanged = newState.filters !== prevState.filters;

    if (pantryChanged || profileChanged || filtersChanged) {
      runRecommendations();
    }

    // Handle recipe detail modal
    if (newState.ui.showRecipeDetail && newState.ui.showRecipeDetail !== prevState.ui.showRecipeDetail) {
      let rec = currentRecommendations.find(
        (r) => r.recipe.id === newState.ui.showRecipeDetail
      );

      // Fallback: the requested recipe (e.g. a saved one) may be filtered out of
      // the current results. Score it on demand so the modal can still open.
      if (!rec) {
        const recipe = RECIPES.find((r) => r.id === newState.ui.showRecipeDetail);
        if (recipe) {
          const state = store.getState();
          const pantryWithRisk = state.pantry.map((item) => ({
            ...item,
            riskLevel: calculateRiskLevel(calculateDaysUntilExpiry(item.expiryDate)),
          }));
          const scored = getRecommendations(
            [recipe], pantryWithRisk, state.profile, {}, COMMUNITY_USERS
          );
          rec = scored[0];
        }
      }

      if (rec) {
        renderRecipeDetail(dom.modalOverlay, dom.recipeModal, rec, store);
      }
    }
  });

  // Load demo pantry on first visit (if pantry is empty and onboarding is done)
  if (profile.onboardingComplete && store.getState().pantry.length === 0) {
    loadDemoPantry(store);
  }

  // Initial recommendation run
  runRecommendations();
}

/**
 * Shows the onboarding quiz overlay for new users.
 */
function showOnboarding(dom, store) {
  renderOnboarding(dom.onboardingContainer, (profileData) => {
    // Save onboarding results to store
    store.dispatch({ type: 'COMPLETE_ONBOARDING', payload: profileData });

    // Hide onboarding overlay with animation
    dom.onboardingOverlay.classList.add('is-hidden');

    // Load demo pantry after short delay for visual transition
    setTimeout(() => {
      if (store.getState().pantry.length === 0) {
        loadDemoPantry(store);
      }
    }, 400);
  });
}

/**
 * Updates the savings bar.
 *
 * The bar reflects how much at-risk food the user has actually rescued from the
 * bin by cooking (cumulative), which is tracked on the profile by the
 * MARK_COOKED action. It is no longer tied to which recipes are merely on screen.
 *
 * @param {HTMLElement} container - The gauge container element.
 * @param {object} profile - The user profile (provides rescuedCount / rescuedGrams).
 */
function updateWasteGauge(container, profile) {
  renderWasteGauge(container, {
    rescuedCount: profile.rescuedCount || 0,
    rescuedGrams: profile.rescuedGrams || 0,
  });
}

/**
 * Renders the community favorites horizontal scroll section.
 * Shows top-rated recipes that also match the user's pantry.
 */
function renderCommunityFavorites(container, recommendations, store) {
  // Filter for recipes with high community engagement
  const communityFaves = recommendations
    .filter((rec) => rec.recipe.cookCount > 100 && rec.recipe.communityRating >= 4.0)
    .sort((a, b) => b.recipe.cookCount - a.recipe.cookCount)
    .slice(0, 6);

  if (communityFaves.length === 0) {
    container.innerHTML = '';
    return;
  }

  const CUISINE_EMOJI = {
    'Italian': '🍝', 'Asian': '🍜', 'Mexican': '🌮', 'Middle Eastern': '🧆',
    'American': '🍔', 'Indian': '🍛', 'Breakfast': '🥞', 'Dessert': '🍰',
    'Mediterranean': '🫒', 'Japanese': '🍱', 'Thai': '🍲', 'French': '🥐',
  };

  container.innerHTML = `
    <div class="community-section__title">🔥 Community Favorites</div>
    <div class="community-scroll">
      ${communityFaves.map((rec) => {
        const emoji = CUISINE_EMOJI[rec.recipe.cuisine] || '🍽️';
        const matchPct = Math.round((rec.matchDetails.matched.length / rec.recipe.ingredients.length) * 100);
        return `
          <div class="community-card" data-recipe-id="${rec.recipe.id}">
            <div class="community-card__emoji">${emoji}</div>
            <div class="community-card__title">${rec.recipe.title}</div>
            <div class="community-card__stat">♥ ${rec.recipe.cookCount} cooked · ${matchPct}% match</div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Bind click to open detail
  container.querySelectorAll('.community-card').forEach((card) => {
    card.addEventListener('click', () => {
      store.dispatch({ type: 'SHOW_RECIPE_DETAIL', payload: card.dataset.recipeId });
    });
  });
}

// --- Bootstrap ---
document.addEventListener('DOMContentLoaded', initApp);