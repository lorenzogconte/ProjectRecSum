/**
 * @module helpers
 * Utility functions for SmartBite — date handling, risk levels, and normalization.
 */

/**
 * Calculate the number of days until an ingredient expires.
 * Negative values indicate the item is already expired.
 * @param {string} expiryDateStr - ISO date string (YYYY-MM-DD)
 * @returns {number} Days until expiry (negative if expired)
 */
export function calculateDaysUntilExpiry(expiryDateStr) {
  const expiry = new Date(expiryDateStr);
  const now = new Date();
  // Zero out time portions for clean day-level comparison
  const expiryDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = expiryDay - today;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine the risk level based on days until expiry.
 * @param {number} daysUntilExpiry - Days until expiry (can be negative)
 * @returns {"expired"|"high"|"medium"|"low"} Risk level
 */
export function calculateRiskLevel(daysUntilExpiry) {
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 3) return 'high';
  if (daysUntilExpiry <= 7) return 'medium';
  return 'low';
}

/**
 * Default shelf life (in days) by ingredient category.
 * Used when no explicit expiry date is provided.
 */
const DEFAULT_SHELF_LIFE = {
  produce: 5,
  dairy: 7,
  protein: 3,
  grain: 30,
  spice: 180,
  condiment: 90,
  other: 14
};

/**
 * Estimate an expiry date based on ingredient category and the date it was added.
 * @param {string} category - Ingredient category (produce, dairy, protein, grain, spice, condiment, other)
 * @param {string} addedDateStr - ISO date string when the item was added
 * @returns {string} Estimated expiry date as ISO date string (YYYY-MM-DD)
 */
export function estimateExpiryDate(category, addedDateStr) {
  const addedDate = new Date(addedDateStr);
  const shelfLife = DEFAULT_SHELF_LIFE[category] ?? DEFAULT_SHELF_LIFE.other;
  const expiryDate = new Date(addedDate);
  expiryDate.setDate(expiryDate.getDate() + shelfLife);
  return expiryDate.toISOString().split('T')[0];
}

/**
 * Format a date string into a human-readable format.
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string} Human-readable date (e.g., "June 15, 2025")
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Normalize a value to a 0–1 range using min-max scaling.
 * Clamps the result to [0, 1].
 * @param {number} value - The value to normalize
 * @param {number} min - Minimum of the range
 * @param {number} max - Maximum of the range
 * @returns {number} Normalized value between 0 and 1
 */
export function normalizeScore(value, min, max) {
  if (max === min) return 0;
  const normalized = (value - min) / (max - min);
  return Math.max(0, Math.min(1, normalized));
}
