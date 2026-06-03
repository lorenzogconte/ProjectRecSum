/**
 * @module community
 * Simulated community user profiles for collaborative filtering.
 * 15 users with diverse dietary preferences, flavor preferences, and cooking histories.
 */

export const COMMUNITY_USERS = [
  {
    id: "sim-001",
    dietaryRestrictions: ["vegetarian"],
    flavorPreferences: ["savory", "spicy"],
    cookedRecipes: ["rec-001", "rec-004", "rec-009", "rec-014"],
    ratings: { "rec-001": 5, "rec-004": 4, "rec-009": 5, "rec-014": 4 }
  },
  {
    id: "sim-002",
    dietaryRestrictions: ["vegan"],
    flavorPreferences: ["savory", "earthy"],
    cookedRecipes: ["rec-005", "rec-009", "rec-012", "rec-018", "rec-025"],
    ratings: { "rec-005": 4, "rec-009": 5, "rec-012": 4, "rec-018": 5, "rec-025": 3 }
  },
  {
    id: "sim-003",
    dietaryRestrictions: [],
    flavorPreferences: ["bold", "savory", "smoky"],
    cookedRecipes: ["rec-015", "rec-017", "rec-020", "rec-010"],
    ratings: { "rec-015": 5, "rec-017": 4, "rec-020": 5, "rec-010": 4 }
  },
  {
    id: "sim-004",
    dietaryRestrictions: ["gluten-free"],
    flavorPreferences: ["savory", "spicy", "tangy"],
    cookedRecipes: ["rec-003", "rec-014", "rec-020", "rec-009"],
    ratings: { "rec-003": 4, "rec-014": 5, "rec-020": 4, "rec-009": 5 }
  },
  {
    id: "sim-005",
    dietaryRestrictions: ["vegetarian"],
    flavorPreferences: ["sweet", "creamy"],
    cookedRecipes: ["rec-022", "rec-023", "rec-024", "rec-025", "rec-027"],
    ratings: { "rec-022": 5, "rec-023": 3, "rec-024": 5, "rec-025": 4, "rec-027": 3 }
  },
  {
    id: "sim-006",
    dietaryRestrictions: [],
    flavorPreferences: ["umami", "savory"],
    cookedRecipes: ["rec-006", "rec-007", "rec-008"],
    ratings: { "rec-006": 5, "rec-007": 4, "rec-008": 5 }
  },
  {
    id: "sim-007",
    dietaryRestrictions: ["vegan", "gluten-free"],
    flavorPreferences: ["spicy", "earthy"],
    cookedRecipes: ["rec-009", "rec-011", "rec-018", "rec-025"],
    ratings: { "rec-009": 5, "rec-011": 4, "rec-018": 5, "rec-025": 4 }
  },
  {
    id: "sim-008",
    dietaryRestrictions: [],
    flavorPreferences: ["savory", "herby"],
    cookedRecipes: ["rec-001", "rec-002", "rec-003", "rec-016", "rec-028"],
    ratings: { "rec-001": 4, "rec-002": 5, "rec-003": 4, "rec-016": 3, "rec-028": 4 }
  },
  {
    id: "sim-009",
    dietaryRestrictions: ["vegetarian"],
    flavorPreferences: ["tangy", "savory"],
    cookedRecipes: ["rec-012", "rec-013", "rec-014", "rec-028"],
    ratings: { "rec-012": 4, "rec-013": 3, "rec-014": 5, "rec-028": 4 }
  },
  {
    id: "sim-010",
    dietaryRestrictions: [],
    flavorPreferences: ["spicy", "bold"],
    cookedRecipes: ["rec-010", "rec-020", "rec-029"],
    ratings: { "rec-010": 4, "rec-020": 5, "rec-029": 4 }
  },
  {
    id: "sim-011",
    dietaryRestrictions: ["dairy-free"],
    flavorPreferences: ["savory", "smoky"],
    cookedRecipes: ["rec-004", "rec-005", "rec-017", "rec-009"],
    ratings: { "rec-004": 5, "rec-005": 4, "rec-017": 4, "rec-009": 4 }
  },
  {
    id: "sim-012",
    dietaryRestrictions: ["vegan"],
    flavorPreferences: ["sweet", "fruity"],
    cookedRecipes: ["rec-021", "rec-025", "rec-026"],
    ratings: { "rec-021": 4, "rec-025": 5, "rec-026": 4 }
  },
  {
    id: "sim-013",
    dietaryRestrictions: [],
    flavorPreferences: ["creamy", "mild"],
    cookedRecipes: ["rec-001", "rec-003", "rec-019", "rec-022", "rec-030"],
    ratings: { "rec-001": 5, "rec-003": 5, "rec-019": 4, "rec-022": 4, "rec-030": 4 }
  },
  {
    id: "sim-014",
    dietaryRestrictions: ["vegetarian"],
    flavorPreferences: ["herby", "tangy", "earthy"],
    cookedRecipes: ["rec-002", "rec-012", "rec-013", "rec-028"],
    ratings: { "rec-002": 4, "rec-012": 5, "rec-013": 4, "rec-028": 5 }
  },
  {
    id: "sim-015",
    dietaryRestrictions: [],
    flavorPreferences: ["sweet", "warm"],
    cookedRecipes: ["rec-022", "rec-024", "rec-026", "rec-027"],
    ratings: { "rec-022": 5, "rec-024": 5, "rec-026": 3, "rec-027": 4 }
  }
];
