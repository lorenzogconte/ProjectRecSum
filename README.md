# SmartBite — Pantry-First Recipe Recommender

> A sustainable recipe recommender that turns leftover ingredients into meals, reducing household food waste in alignment with **SDG 12.3: Halve global per capita food waste**.

![SmartBite](https://img.shields.io/badge/SDG_12-Responsible_Consumption-34d399?style=for-the-badge) ![License](https://img.shields.io/badge/License-Academic-blue?style=for-the-badge)

---

## 🚀 Quick Start

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- One of the following to serve files locally:
  - **Node.js** (for `npx serve`)
  - **Python 3** (for `python -m http.server`)

### Running the Application

**Option 1: Using Node.js**
```bash
npx -y serve .
```
Then open [http://localhost:3000](http://localhost:3000)

**Option 2: Using Python**
```bash
python -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000)

> **Note:** A local server is required because the app uses ES modules, which don't work with `file://` protocol due to CORS restrictions.

### Running Tests
Open `tests/test-runner.html` in your browser (via the local server):
- http://localhost:3000/tests/test-runner.html (Node.js)
- http://localhost:8000/tests/test-runner.html (Python)

---

## 📖 How It Works

### User Journey

1. **Onboarding (Cold Start):** New users complete a quick 3-step quiz:
   - Dietary restrictions & allergies (hard safety constraints)
   - Flavor preferences (sweet, savory, spicy, etc.)
   - Optional nutritional goals (calorie range, macro focus)

2. **Pantry Management:** Add ingredients via autocomplete search. Each item gets:
   - An estimated shelf life (editable) with color-coded urgency badges
   - Risk levels: 🔴 High (≤3 days), 🟡 Medium (≤7 days), 🟢 Low (>7 days)

3. **Recipe Discovery:** Browse recommended recipes with:
   - Match percentage showing pantry ingredient coverage
   - Community ratings and cook counts
   - Dynamic filters (taste, cook time, dietary)

4. **Recipe Detail:** Click any recipe card to see:
   - ✅ Matched ingredients, ⚠️ Expiring ingredients, ❌ Missing items
   - 🔄 **Pantry Swap** suggestions (e.g., "cream → greek yogurt")
   - Nutrition facts, step-by-step instructions
   - "Mark as Cooked" to update your pantry automatically

5. **Waste-to-Taste Gauge:** A live indicator showing what percentage of your expiring ingredients are covered by displayed recipes.

---

## 🧠 Recommendation Engine

### Priority Architecture: Safety → Waste Reduction → Preference

| Phase | Type | Description |
|-------|------|-------------|
| **Phase 1** | Hard Filter | Excludes recipes violating dietary restrictions or containing allergens |
| **Phase 2** | Multi-Signal Scoring | Weighted composite of 6 signals (see below) |
| **Phase 3** | Diversity Re-ranking | Promotes lesser-known recipes to counter the Matthew effect |

### Scoring Weights

| Signal | Weight | Source |
|--------|--------|--------|
| Ingredient Match | 35% | Content-based: matched / total ingredients |
| Urgency Bonus | 25% | Content-based: at-risk pantry items used |
| Collaborative Score | 15% | Simulated: similar user preferences |
| Flavor Alignment | 10% | Content-based: recipe ↔ user flavor match |
| Nutritional Fit | 10% | Content-based: calorie/macro goal alignment |
| Popularity | 5% | Collaborative: normalized community rating |

### Recommendation Explanations
Each recipe includes a human-readable explanation of *why* it was recommended:
- "Uses 5 of your 6 pantry items, including 2 expiring soon"
- "Popular with users who share your dietary preferences"
- "Fits your high-protein goal (32g per serving)"
- "Hidden gem: lesser-known but matches your pantry perfectly"

---

## 🏗️ Architecture

```
ProjectRecSum/
├── index.html                  # App entry point
├── css/styles.css              # Design system (dark eco-modern theme)
├── js/
│   ├── app.js                  # Main controller & reactive rendering loop
│   ├── data/
│   │   ├── recipes.js          # 30 mock recipes
│   │   ├── ingredients.js      # Master ingredient database
│   │   └── community.js        # Simulated user profiles
│   ├── engine/
│   │   ├── recommender.js      # Orchestrator: filter → score → re-rank
│   │   ├── dietary-filter.js   # Hard constraint safety filter
│   │   ├── content-filter.js   # Ingredient match + urgency + flavor + nutrition
│   │   ├── collab-filter.js    # Simulated collaborative filtering
│   │   ├── diversity.js        # Matthew effect mitigation
│   │   └── swaps.js            # Pantry swap suggestions
│   ├── state/store.js          # Reactive state management + localStorage
│   ├── components/
│   │   ├── onboarding.js       # Cold-start quiz
│   │   ├── pantry.js           # Pantry manager + autocomplete
│   │   ├── filters-bar.js      # Dynamic filter UI
│   │   ├── recipe-card.js      # Recipe cards with match rings
│   │   ├── recipe-detail.js    # Detail modal with swaps
│   │   ├── waste-gauge.js      # Ingredient coverage gauge
│   │   └── profile.js          # Profile settings drawer
│   └── utils/helpers.js        # Date math, shelf-life estimation
├── tests/
│   ├── test-runner.html        # In-browser test runner
│   ├── dietary-filter.test.js
│   ├── content-filter.test.js
│   ├── collab-filter.test.js
│   ├── diversity.test.js
│   ├── swaps.test.js
│   └── recommender.test.js
└── README.md
```

### Technology Stack
- **Pure HTML/CSS/JavaScript** — no frameworks, no build tools
- **ES Modules** for clean code organization
- **localStorage** for state persistence
- **CSS Custom Properties** for theming
- **Glassmorphism** dark theme with micro-animations

---

## 📚 Academic Context

This prototype was developed as part of a Recommender Systems course project exploring **SDG 12.3** (Halving global food waste). It demonstrates how content-based and collaborative filtering can be combined in a food-waste-reduction context, following principles from:

- Elsweiler et al. (2017) — Hybrid recipe recommendation
- Shirai et al. (2021) — Flexible ingredient substitutions
- Trang Tran et al. (2018) — Cold-start handling via onboarding
- Ziegler et al. (2005) — Diversity-aware re-ranking
- Trattner & Elsweiler (2017) — Minority diet representation

---

## 📝 Notes

- All recipe and user data is **mock/simulated** — no external APIs or databases
- The collaborative filtering uses pre-built simulated user profiles
- State persists across browser sessions via localStorage
- Use "Reset All Data" in Profile settings to start fresh
