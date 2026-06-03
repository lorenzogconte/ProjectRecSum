/**
 * Onboarding Component — 3-step cold-start quiz
 *
 * Handles new-user setup: dietary restrictions, flavor preferences,
 * and optional nutritional goals. Results feed the recommendation engine
 * so it can produce relevant results immediately (Trang Tran et al. 2018).
 */

const STEPS = [
  {
    id: 'dietary',
    icon: '🛡️',
    title: 'Dietary Requirements',
    subtitle: 'Select any dietary restrictions or allergies. These are safety-first hard constraints — recipes that violate them will never be shown.',
    options: [
      { value: 'vegan', label: 'Vegan', icon: '🌱' },
      { value: 'vegetarian', label: 'Vegetarian', icon: '🥚' },
      { value: 'gluten-free', label: 'Gluten-Free', icon: '🌾' },
      { value: 'dairy-free', label: 'Dairy-Free', icon: '🥛' },
      { value: 'nut-free', label: 'Nut-Free', icon: '🥜' },
    ],
    field: 'dietaryRestrictions',
    multiSelect: true,
  },
  {
    id: 'flavors',
    icon: '🎨',
    title: 'Flavor Preferences',
    subtitle: 'What flavors do you enjoy? This helps us rank recipes that match your taste. You can change this anytime.',
    options: [
      { value: 'sweet', label: 'Sweet', icon: '🍯' },
      { value: 'savory', label: 'Savory', icon: '🧀' },
      { value: 'spicy', label: 'Spicy', icon: '🌶️' },
      { value: 'mild', label: 'Mild', icon: '🍃' },
      { value: 'comfort', label: 'Comfort', icon: '🍲' },
    ],
    field: 'flavorPreferences',
    multiSelect: true,
  },
  {
    id: 'goals',
    icon: '🎯',
    title: 'Nutritional Goals',
    subtitle: 'Optional: set calorie and macro preferences. These softly influence ranking but never exclude recipes.',
    options: [
      { value: 'high', label: 'High Protein', icon: '💪' },
      { value: 'low-carb', label: 'Low Carb', icon: '🥑' },
      { value: 'low-fat', label: 'Low Fat', icon: '🥗' },
      { value: 'balanced', label: 'Balanced', icon: '⚖️' },
    ],
    field: 'macroGoalPreset',
    multiSelect: false,
  },
];

/**
 * Renders the onboarding quiz into the container.
 * @param {HTMLElement} container - The onboarding container element.
 * @param {function} onComplete - Callback with profile data when user finishes.
 */
export function renderOnboarding(container, onComplete) {
  let currentStep = 0;
  let selections = {
    dietaryRestrictions: [],
    flavorPreferences: [],
    macroGoalPreset: null,
    calorieTarget: { min: 300, max: 800 },
  };

  function render() {
    const step = STEPS[currentStep];
    const isLast = currentStep === STEPS.length - 1;

    container.innerHTML = `
      <!-- Progress bar -->
      <div class="onboarding__progress">
        ${STEPS.map((_, i) => `
          <div class="onboarding__progress-step ${i < currentStep ? 'is-done' : ''} ${i === currentStep ? 'is-active' : ''}"></div>
        `).join('')}
      </div>

      <div class="onboarding__icon">${step.icon}</div>
      <h1 class="onboarding__title">${step.title}</h1>
      <p class="onboarding__subtitle">${step.subtitle}</p>

      ${step.id === 'goals' ? renderGoalsStep(step) : renderOptionsStep(step)}

      <div class="onboarding__actions">
        ${currentStep > 0
          ? '<button class="btn btn--ghost" id="onboarding-back">← Back</button>'
          : '<button class="btn btn--ghost" id="onboarding-skip">Skip Setup</button>'
        }
        <button class="btn btn--primary btn--lg" id="onboarding-next">
          ${isLast ? '🚀 Start Cooking' : 'Continue →'}
        </button>
      </div>
    `;

    bindEvents(step, isLast);
  }

  function renderOptionsStep(step) {
    const selected = selections[step.field] || [];
    return `
      <div class="onboarding__options">
        ${step.options.map((opt) => `
          <button class="onboarding__option ${
            step.multiSelect
              ? (selected.includes(opt.value) ? 'is-selected' : '')
              : (selections[step.field] === opt.value ? 'is-selected' : '')
          }" data-value="${opt.value}">
            <span class="onboarding__option-icon">${opt.icon}</span>
            ${opt.label}
          </button>
        `).join('')}
      </div>
    `;
  }

  function renderGoalsStep(step) {
    return `
      <div class="onboarding__options" style="margin-bottom: var(--space-lg);">
        ${step.options.map((opt) => `
          <button class="onboarding__option ${selections.macroGoalPreset === opt.value ? 'is-selected' : ''}" data-value="${opt.value}">
            <span class="onboarding__option-icon">${opt.icon}</span>
            ${opt.label}
          </button>
        `).join('')}
      </div>

      <div class="onboarding__range-group">
        <div class="onboarding__range-row">
          <span class="onboarding__range-label">Min Calories</span>
          <input type="range" class="onboarding__range-input" id="cal-min"
            min="100" max="600" step="50" value="${selections.calorieTarget.min}">
          <span class="onboarding__range-value" id="cal-min-val">${selections.calorieTarget.min} kcal</span>
        </div>
        <div class="onboarding__range-row">
          <span class="onboarding__range-label">Max Calories</span>
          <input type="range" class="onboarding__range-input" id="cal-max"
            min="400" max="1200" step="50" value="${selections.calorieTarget.max}">
          <span class="onboarding__range-value" id="cal-max-val">${selections.calorieTarget.max} kcal</span>
        </div>
      </div>
    `;
  }

  function bindEvents(step, isLast) {
    // Option toggle buttons
    container.querySelectorAll('.onboarding__option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;

        if (step.multiSelect) {
          const arr = selections[step.field];
          if (arr.includes(value)) {
            selections[step.field] = arr.filter((v) => v !== value);
          } else {
            selections[step.field] = [...arr, value];
          }
        } else {
          selections[step.field] = selections[step.field] === value ? null : value;
        }

        render(); // Re-render to update selection visuals
      });
    });

    // Calorie range sliders
    const calMin = container.querySelector('#cal-min');
    const calMax = container.querySelector('#cal-max');
    if (calMin) {
      calMin.addEventListener('input', (e) => {
        selections.calorieTarget.min = parseInt(e.target.value);
        container.querySelector('#cal-min-val').textContent = `${e.target.value} kcal`;
      });
    }
    if (calMax) {
      calMax.addEventListener('input', (e) => {
        selections.calorieTarget.max = parseInt(e.target.value);
        container.querySelector('#cal-max-val').textContent = `${e.target.value} kcal`;
      });
    }

    // Navigation buttons
    const nextBtn = container.querySelector('#onboarding-next');
    const backBtn = container.querySelector('#onboarding-back');
    const skipBtn = container.querySelector('#onboarding-skip');

    nextBtn.addEventListener('click', () => {
      if (isLast) {
        completeOnboarding();
      } else {
        currentStep++;
        render();
      }
    });

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        currentStep--;
        render();
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', completeOnboarding);
    }
  }

  /** Translates selections into profile data and fires callback */
  function completeOnboarding() {
    const macroGoals = translateMacroPreset(selections.macroGoalPreset);
    const profileData = {
      dietaryRestrictions: selections.dietaryRestrictions,
      flavorPreferences: selections.flavorPreferences,
      calorieTarget: selections.calorieTarget,
      macroGoals,
    };

    onComplete(profileData);
  }

  render();
}

/** Maps a macro preset label to structured macro goals */
function translateMacroPreset(preset) {
  const presets = {
    'high': { protein: 'high', carbs: 'moderate', fat: 'moderate' },
    'low-carb': { protein: 'moderate', carbs: 'low', fat: 'moderate' },
    'low-fat': { protein: 'moderate', carbs: 'moderate', fat: 'low' },
    'balanced': { protein: 'moderate', carbs: 'moderate', fat: 'moderate' },
  };
  return presets[preset] || { protein: null, carbs: null, fat: null };
}
