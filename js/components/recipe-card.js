/**
 * Recipe Card Component
 *
 * Renders recipe cards in a grid with:
 * - Match percentage ring (color-coded)
 * - Urgency badge for at-risk ingredients
 * - Community stats
 * - Recommendation explanation
 */

/** Recipe emoji by cuisine for visual distinction */
const CUISINE_EMOJI = {
  'Italian': '🍝',
  'Asian': '🍜',
  'Mexican': '🌮',
  'Middle Eastern': '🧆',
  'American': '🍔',
  'Indian': '🍛',
  'Breakfast': '🥞',
  'Dessert': '🍰',
  'Mediterranean': '🫒',
  'Japanese': '🍱',
  'Thai': '🍲',
  'French': '🥐',
};

/** Gradient class rotation for card images */
const GRADIENT_CLASSES = [
  'recipe-card__image--gradient-1',
  'recipe-card__image--gradient-2',
  'recipe-card__image--gradient-3',
  'recipe-card__image--gradient-4',
  'recipe-card__image--gradient-5',
  'recipe-card__image--gradient-6',
];

/**
 * Renders all recipe cards into the grid.
 * @param {HTMLElement} container - The recipe grid element.
 * @param {Array} recommendations - Scored recipe objects from the recommender.
 * @param {object} store - The application store.
 */
export function renderRecipeCards(container, recommendations, store) {
  if (recommendations.length === 0) {
    container.innerHTML = `
      <div class="recipe-grid-empty">
        <div class="recipe-grid-empty__icon">🔍</div>
        <h3>No recipes match your current filters</h3>
        <p class="text-muted" style="margin-top: var(--space-sm);">
          Try adjusting your filters, or add more ingredients to your pantry.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = recommendations
    .map((rec, i) => renderCard(rec, i))
    .join('');

  // Bind click events to open detail modal
  container.querySelectorAll('.recipe-card').forEach((card) => {
    card.addEventListener('click', () => {
      store.dispatch({ type: 'SHOW_RECIPE_DETAIL', payload: card.dataset.recipeId });
    });
  });
}

/**
 * Renders a single recipe card.
 */
function renderCard({ recipe, score, explanation, matchDetails }, index) {
  const matchPercent = Math.round((matchDetails.matched.length / recipe.ingredients.length) * 100);
  const matchColor = getMatchColor(matchPercent);
  const gradientClass = GRADIENT_CLASSES[index % GRADIENT_CLASSES.length];
  const emoji = CUISINE_EMOJI[recipe.cuisine] || '🍽️';
  const atRiskCount = matchDetails.atRiskUsed.length;

  // matchDetails.missing holds ingredient IDs (e.g. "ing-tomato"). Map them to
  // human-readable names using the recipe's own ingredient list for display.
  const nameById = new Map(recipe.ingredients.map((ri) => [ri.ingredientId, ri.name]));
  const missingNames = matchDetails.missing.map((id) => capitalize(nameById.get(id) || id));

  // SVG circle math for match ring
  const radius = 19;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (matchPercent / 100) * circumference;

  return `
    <article class="recipe-card" data-recipe-id="${recipe.id}" tabindex="0"
      role="button" aria-label="View recipe: ${recipe.title}">

      <div class="recipe-card__image ${gradientClass}">
        <span>${emoji}</span>
        <div class="recipe-card__badges">
          <span class="recipe-card__cuisine">${recipe.cuisine}</span>
          ${atRiskCount > 0 ? `
            <span class="recipe-card__urgency">🍃 Uses ${atRiskCount} expiring</span>
          ` : ''}
        </div>
      </div>

      <div class="recipe-card__content">
        <h3 class="recipe-card__title">${recipe.title}</h3>
        <p class="recipe-card__description">${recipe.description}</p>

        <!-- Match ring + info -->
        <div class="recipe-card__match">
          <div class="match-ring">
            <svg class="match-ring__svg" viewBox="0 0 44 44">
              <circle class="match-ring__bg" cx="22" cy="22" r="${radius}" />
              <circle class="match-ring__fill" cx="22" cy="22" r="${radius}"
                stroke="${matchColor}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${dashOffset}" />
            </svg>
            <span class="match-ring__text" style="color: ${matchColor}">${matchPercent}%</span>
          </div>
          <div class="recipe-card__match-info">
            <div class="recipe-card__match-label">
              ${matchDetails.matched.length}/${recipe.ingredients.length} ingredients matched
            </div>
            <div class="recipe-card__match-detail">
              ${missingNames.length > 0
                ? `Missing: ${missingNames.slice(0, 2).join(', ')}${missingNames.length > 2 ? '…' : ''}`
                : '✨ You have everything!'}
            </div>
          </div>
        </div>

        <!-- Meta row -->
        <div class="recipe-card__meta">
          <span class="recipe-card__meta-item">
            <span class="recipe-card__meta-icon">⏱️</span> ${recipe.prepTime} min
          </span>
          <span class="recipe-card__meta-item">
            <span class="recipe-card__meta-icon">📊</span> ${capitalize(recipe.difficulty)}
          </span>
          <span class="recipe-card__meta-item">
            <span class="recipe-card__meta-icon">🔥</span> ${recipe.nutrition.calories} kcal
          </span>
          <span class="recipe-card__community">
            <span class="recipe-card__community-heart">♥</span> ${recipe.cookCount} ·
            ★ ${recipe.communityRating.toFixed(1)}
          </span>
        </div>

        <!-- Explanation -->
        <div class="recipe-card__explanation">
          💡 ${explanation}
        </div>
      </div>
    </article>
  `;
}

/** Returns a color for the match percentage */
function getMatchColor(percent) {
  if (percent >= 80) return '#34d399'; // emerald
  if (percent >= 50) return '#f59e0b'; // amber
  return '#f87171'; // coral
}

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}