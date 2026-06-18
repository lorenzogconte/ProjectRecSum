/**
 * SmartBite — Simple Reactive State Store
 *
 * Manages application state with pub/sub notifications.
 * State is persisted to localStorage for pantry, profile, and cooking history.
 *
 * Architecture: single source of truth with immutable updates.
 * Components subscribe to state changes and re-render when relevant slices change.
 */

const STORAGE_KEY = 'smartbite_state';

/**
 * Default user profile for new users (before onboarding).
 * Dietary restrictions and allergies are hard constraints (safety-first).
 * Flavor preferences, calorie/macro goals are soft ranking signals.
 */
const DEFAULT_PROFILE = {
  id: 'user-001',
  name: 'Demo User',
  onboardingComplete: false,
  dietaryRestrictions: [],
  allergies: [],
  flavorPreferences: [],
  calorieTarget: { min: 300, max: 800 },
  macroGoals: { protein: null, carbs: null, fat: null },
  maxPrepTime: null,
  savedRecipes: [],
  cookedRecipes: [],
  ratings: {},

  // --- Food-waste savings (drives the savings bar) ---
  // Lifetime count of at-risk pantry items actually rescued by cooking.
  rescuedCount: 0,
  // Approximate lifetime grams rescued (parsed from weight/volume amounts only).
  rescuedGrams: 0,
  // Per-cook history, useful for debugging / future stats.
  wasteLog: [],
};

/** Default application state */
const DEFAULT_STATE = {
  pantry: [],
  profile: { ...DEFAULT_PROFILE },
  filters: {
    taste: [],
    maxTime: null,
    sortBy: 'bestMatch', // bestMatch | expiringFirst | quickEasy | community
  },
  ui: {
    currentView: 'main',
    showRecipeDetail: null,
    showProfile: false,
  },
};

/**
 * Creates a reactive store with pub/sub pattern.
 * @param {object} initialState - Starting state, merged with saved state from localStorage.
 * @returns {{ getState, dispatch, subscribe }}
 */
export function createStore(initialState = DEFAULT_STATE) {
  const savedState = loadState();
  let state = mergeState(initialState, savedState);
  let listeners = [];

  /**
   * Returns a shallow copy of current state.
   * Components should treat returned state as read-only.
   */
  function getState() {
    return { ...state };
  }

  /**
   * Dispatches an action to update state.
   * Actions are plain objects with a `type` and optional `payload`.
   * @param {{ type: string, payload?: any }} action
   */
  function dispatch(action) {
    const prevState = state;
    state = reduce(state, action);

    // Persist pantry, profile, and filters to localStorage
    saveState(state);

    // Notify all subscribers
    listeners.forEach((listener) => listener(state, prevState));
  }

  /**
   * Subscribes a listener function that is called on every state change.
   * @param {function} listener - Receives (newState, prevState).
   * @returns {function} Unsubscribe function.
   */
  function subscribe(listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }

  return { getState, dispatch, subscribe };
}

/**
 * Pure reducer: produces new state from current state + action.
 * Each case returns a new state object (immutable update).
 */
function reduce(state, action) {
  switch (action.type) {
    // --- Pantry actions ---
    case 'ADD_PANTRY_ITEM':
      return {
        ...state,
        pantry: [...state.pantry, action.payload],
      };

    case 'REMOVE_PANTRY_ITEM':
      return {
        ...state,
        pantry: state.pantry.filter((item) => item.id !== action.payload),
      };

    case 'UPDATE_PANTRY_ITEM':
      return {
        ...state,
        pantry: state.pantry.map((item) =>
          item.id === action.payload.id ? { ...item, ...action.payload } : item
        ),
      };

    case 'SET_PANTRY':
      return { ...state, pantry: action.payload };

    case 'CLEAR_PANTRY':
      return { ...state, pantry: [] };

    // --- Profile actions ---
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profile: { ...state.profile, ...action.payload },
      };

    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        profile: { ...state.profile, ...action.payload, onboardingComplete: true },
      };

    case 'SAVE_RECIPE':
      return {
        ...state,
        profile: {
          ...state.profile,
          savedRecipes: state.profile.savedRecipes.includes(action.payload)
            ? state.profile.savedRecipes
            : [...state.profile.savedRecipes, action.payload],
        },
      };

    case 'UNSAVE_RECIPE':
      return {
        ...state,
        profile: {
          ...state.profile,
          savedRecipes: state.profile.savedRecipes.filter((id) => id !== action.payload),
        },
      };

    case 'MARK_COOKED': {
      const {
        recipeId,
        usedIngredientIds,
        atRiskIngredientIds = [],
        gramsByIngredientId = {},
      } = action.payload;

      // A rescue only counts if the at-risk item is actually still in the pantry
      // at cook time. This prevents double-counting when the same expiring item
      // appears in two recipes and was already used by an earlier cook.
      const pantryIngredientIds = new Set(state.pantry.map((item) => item.ingredientId));
      const rescuedIds = atRiskIngredientIds.filter((id) => pantryIngredientIds.has(id));

      const rescuedCount = rescuedIds.length;
      const rescuedGrams = rescuedIds.reduce(
        (sum, id) => sum + (gramsByIngredientId[id] || 0),
        0
      );

      const alreadyCooked = state.profile.cookedRecipes.includes(recipeId);

      return {
        ...state,
        profile: {
          ...state.profile,
          cookedRecipes: alreadyCooked
            ? state.profile.cookedRecipes
            : [...state.profile.cookedRecipes, recipeId],
          rescuedCount: (state.profile.rescuedCount || 0) + rescuedCount,
          rescuedGrams: (state.profile.rescuedGrams || 0) + rescuedGrams,
          wasteLog: [
            ...(state.profile.wasteLog || []),
            { recipeId, count: rescuedCount, grams: rescuedGrams, at: Date.now() },
          ],
        },
        // Remove used ingredients from pantry
        pantry: state.pantry.filter(
          (item) => !usedIngredientIds.includes(item.ingredientId)
        ),
      };
    }

    case 'RATE_RECIPE':
      return {
        ...state,
        profile: {
          ...state.profile,
          ratings: { ...state.profile.ratings, [action.payload.recipeId]: action.payload.rating },
        },
      };

    // --- Filter actions ---
    case 'TOGGLE_TASTE_FILTER': {
      const taste = action.payload;
      const current = state.filters.taste;
      return {
        ...state,
        filters: {
          ...state.filters,
          taste: current.includes(taste)
            ? current.filter((t) => t !== taste)
            : [...current, taste],
        },
      };
    }

    case 'SET_TIME_FILTER':
      return {
        ...state,
        filters: { ...state.filters, maxTime: action.payload },
      };

    case 'SET_SORT':
      return {
        ...state,
        filters: { ...state.filters, sortBy: action.payload },
      };

    case 'CLEAR_FILTERS':
      return {
        ...state,
        filters: { taste: [], maxTime: null, sortBy: 'bestMatch' },
      };

    // --- UI actions ---
    case 'SHOW_RECIPE_DETAIL':
      return {
        ...state,
        ui: { ...state.ui, showRecipeDetail: action.payload },
      };

    case 'HIDE_RECIPE_DETAIL':
      return {
        ...state,
        ui: { ...state.ui, showRecipeDetail: null },
      };

    case 'TOGGLE_PROFILE':
      return {
        ...state,
        ui: { ...state.ui, showProfile: !state.ui.showProfile },
      };

    case 'SET_VIEW':
      return {
        ...state,
        ui: { ...state.ui, currentView: action.payload },
      };

    default:
      console.warn(`Unknown action type: ${action.type}`);
      return state;
  }
}

/** Persists relevant state slices to localStorage */
function saveState(state) {
  try {
    const toSave = {
      pantry: state.pantry,
      profile: state.profile,
      filters: state.filters,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.error({ error: err }, 'Failed to save state to localStorage');
  }
}

/** Loads saved state from localStorage, returns null if none exists */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error({ error: err }, 'Failed to load state from localStorage');
    return null;
  }
}

/** Deep-merges saved state into default state, preserving defaults for missing keys */
function mergeState(defaults, saved) {
  if (!saved) return { ...defaults };

  return {
    pantry: saved.pantry || defaults.pantry,
    // Spreading defaults first guarantees new fields (rescuedCount, rescuedGrams,
    // wasteLog) exist even for users who saved state before this update.
    profile: { ...defaults.profile, ...saved.profile },
    filters: { ...defaults.filters, ...saved.filters },
    ui: { ...defaults.ui }, // UI state always resets on page load
  };
}