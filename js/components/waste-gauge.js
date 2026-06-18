/**
 * Waste-to-Taste / Savings Gauge Component
 *
 * Visual indicator of how much food the user has actually saved from the bin
 * by cooking expiring ("at-risk") ingredients.
 *
 * Primary signal: cumulative COUNT of at-risk pantry items rescued by cooking.
 * Secondary signal: an approximate grams figure (only from weight/volume amounts).
 *
 * The bar fills toward the next "rescue level" (every MILESTONE_STEP items), so
 * it advances every time the user cooks something that uses expiring food.
 *
 * Backwards compatible: if called the old way with { atRiskTotal, atRiskCovered }
 * it falls back to the previous coverage-of-displayed-recipes behaviour, so the
 * header won't break before app.js is updated to the new params.
 */

/** Items per rescue level. Tune to taste. */
const MILESTONE_STEP = 10;

/** Encouraging messages keyed by total items rescued. */
const MESSAGES = [
  { threshold: 0,  message: "Let's rescue some food!", icon: '🌱' },
  { threshold: 1,  message: 'First save — nice!',      icon: '🌿' },
  { threshold: 2,  message: 'Building momentum!',      icon: '🌿' },
  { threshold: 10, message: 'Waste warrior mode!',     icon: '🌳' },
  { threshold: 25, message: 'Serious bin-buster!',     icon: '🏆' },
  { threshold: 50, message: 'Zero-waste hero! 🎉',     icon: '🌍' },
];

/**
 * Renders the savings gauge.
 * @param {HTMLElement} container
 * @param {object} params
 * @param {number} [params.rescuedCount] - Cumulative at-risk items rescued by cooking.
 * @param {number} [params.rescuedGrams] - Approximate cumulative grams rescued.
 * @param {number} [params.atRiskTotal]  - (legacy) total at-risk pantry items.
 * @param {number} [params.atRiskCovered]- (legacy) at-risk items used by displayed recipes.
 */
export function renderWasteGauge(container, params = {}) {
  // Legacy fallback: old call signature, new fields absent.
  if (params.rescuedCount === undefined && params.atRiskTotal !== undefined) {
    return renderLegacyCoverage(container, params);
  }

  const rescuedCount = Math.max(0, Math.round(params.rescuedCount || 0));
  const rescuedGrams = Math.max(0, params.rescuedGrams || 0);

  // Progress within the current rescue level.
  const intoLevel = rescuedCount % MILESTONE_STEP;
  const onMilestone = rescuedCount > 0 && intoLevel === 0;
  const fillPercent = onMilestone ? 100 : Math.round((intoLevel / MILESTONE_STEP) * 100);

  const level = Math.floor(rescuedCount / MILESTONE_STEP) + (onMilestone ? 0 : 1);
  const nextGoal = (Math.floor(rescuedCount / MILESTONE_STEP) + 1) * MILESTONE_STEP;
  const toNext = Math.max(0, nextGoal - rescuedCount);

  const msg = getMessageForCount(rescuedCount);
  const itemLabel = rescuedCount === 1 ? 'item' : 'items';

  const gramsSuffix = rescuedGrams > 0 ? ` · ≈ ${formatWeight(rescuedGrams)}` : '';
  const goalSuffix = rescuedCount > 0 ? ` · ${toNext} to level ${level + 1}` : '';

  container.innerHTML = `
    <div class="waste-gauge" title="Food rescued from the bin by cooking: ${rescuedCount} ${itemLabel}${rescuedGrams > 0 ? ` (≈ ${formatWeight(rescuedGrams)})` : ''}">
      <span class="waste-gauge__icon">${msg.icon}</span>
      <div class="waste-gauge__bar-container">
        <div class="waste-gauge__label">
          <span class="waste-gauge__title">Saved from the bin</span>
          <span class="waste-gauge__percent">${rescuedCount} ${itemLabel}</span>
        </div>
        <div class="waste-gauge__bar">
          <div class="waste-gauge__fill" style="width: ${fillPercent}%"></div>
        </div>
        <span class="waste-gauge__message">${msg.message}${gramsSuffix}${goalSuffix}</span>
      </div>
    </div>
  `;
}

/** Returns the message object matching the given rescued-item count. */
function getMessageForCount(count) {
  for (let i = MESSAGES.length - 1; i >= 0; i--) {
    if (count >= MESSAGES[i].threshold) return MESSAGES[i];
  }
  return MESSAGES[0];
}

/** Formats grams into a readable weight (g below 1kg, otherwise kg). */
function formatWeight(grams) {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg.toFixed(kg >= 10 ? 0 : 1)} kg`;
  }
  return `${Math.round(grams)} g`;
}

/* ------------------------------------------------------------------ */
/* Legacy behaviour: % of at-risk items covered by displayed recipes. */
/* Kept so nothing breaks until app.js passes the new params.         */
/* ------------------------------------------------------------------ */

const LEGACY_MESSAGES = [
  { threshold: 0, message: "Let's rescue some ingredients!", icon: '🌱' },
  { threshold: 25, message: 'Good start — keep exploring!', icon: '🌿' },
  { threshold: 50, message: 'Waste warrior mode!', icon: '🌳' },
  { threshold: 75, message: 'Almost zero waste!', icon: '🏆' },
  { threshold: 100, message: 'Zero waste hero! 🎉', icon: '🌍' },
];

function renderLegacyCoverage(container, { atRiskTotal, atRiskCovered }) {
  const percent = atRiskTotal === 0 ? 0 : Math.round((atRiskCovered / atRiskTotal) * 100);
  const clampedPercent = Math.min(percent, 100);

  let message = LEGACY_MESSAGES[0];
  for (let i = LEGACY_MESSAGES.length - 1; i >= 0; i--) {
    if (clampedPercent >= LEGACY_MESSAGES[i].threshold) { message = LEGACY_MESSAGES[i]; break; }
  }

  container.innerHTML = `
    <div class="waste-gauge" title="Ingredient Coverage Rate: ${clampedPercent}% of expiring items are used by displayed recipes">
      <span class="waste-gauge__icon">${message.icon}</span>
      <div class="waste-gauge__bar-container">
        <div class="waste-gauge__label">
          <span class="waste-gauge__title">Waste-to-Taste</span>
          <span class="waste-gauge__percent">${clampedPercent}%</span>
        </div>
        <div class="waste-gauge__bar">
          <div class="waste-gauge__fill" style="width: ${clampedPercent}%"></div>
        </div>
        <span class="waste-gauge__message">${message.message}</span>
      </div>
    </div>
  `;
}