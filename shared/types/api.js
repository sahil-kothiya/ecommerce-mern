/**
 * @typedef {Object} ApiMeta
 * @property {string} timestamp
 * @property {string|null} [requestId]
 * @property {number} [statusCode]
 */

/**
 * @typedef {Object} ApiEnvelope
 * @property {boolean} success
 * @property {Object|Array} data
 * @property {string} message
 * @property {Array} errors
 * @property {ApiMeta} meta
 */

export const API_ENVELOPE_KEYS = Object.freeze([
  "success",
  "data",
  "message",
  "errors",
  "meta",
]);
