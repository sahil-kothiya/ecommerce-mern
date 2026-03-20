/**
 * @typedef {Object} UserSummary
 * @property {string} id
 * @property {string} email
 * @property {string} role
 * @property {string} status
 */

/**
 * @typedef {Object} ProductSummary
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {number} price
 * @property {boolean} hasVariants
 * @property {string} status
 */

export const ENTITY_TYPES = Object.freeze({
  USER: "user",
  PRODUCT: "product",
  ORDER: "order",
});
