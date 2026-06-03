/**
 * Waste-to-Taste Gauge Component
 *
 * Visual indicator showing what percentage of "at risk" pantry items
 * are covered by the currently displayed recipes. This is the
 * "Ingredient Coverage Rate" — a sustainability metric that makes
 * the environmental impact of recipe choices visible.
 */

/** Encouraging messages at coverage thresholds */
const MESSAGES = [
  { threshold: 0, message: "Let's rescue some ingredients!", icon: '🌱' },
  { threshold: 25, message: 'Good start — keep exploring!', icon: '🌿' },
  { threshold: 50, message: 'Waste warrior mode!', icon: '🌳' },
  { threshold: 75, message: 'Almost zero waste!', icon: '🏆' },
  { threshold: 100, message: 'Zero waste hero! 🎉', icon: '🌍' },
];

/**
 * Renders the waste-to-taste gauge.
 * @param {HTMLElement} container - The gauge container element.
 * @param {object} params
 * @param {number} params.atRiskTotal - Total number of at-risk pantry items.
 * @param {number} params.atRiskCovered - Number of at-risk items used in displayed recipes.
 */
export function renderWasteGauge(container, { atRiskTotal, atRiskCovered }) {
  const percent = atRiskTotal === 0 ? 0 : Math.round((atRiskCovered / atRiskTotal) * 100);
  const clampedPercent = Math.min(percent, 100);

  // Find the appropriate message for the current threshold
  const message = getMessageForPercent(clampedPercent);

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

/** Returns the message object matching the given percentage */
function getMessageForPercent(percent) {
  // Walk thresholds in reverse to find the highest matching one
  for (let i = MESSAGES.length - 1; i >= 0; i--) {
    if (percent >= MESSAGES[i].threshold) {
      return MESSAGES[i];
    }
  }
  return MESSAGES[0];
}
