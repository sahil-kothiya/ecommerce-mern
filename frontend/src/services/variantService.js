import apiClient from "./apiClient";
import { API_CONFIG } from "../constants";

const TYPES_BASE = API_CONFIG.ENDPOINTS.VARIANT_TYPES;
const OPTIONS_BASE = API_CONFIG.ENDPOINTS.VARIANT_OPTIONS;

export const variantTypeService = {
  getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`${TYPES_BASE}${qs ? `?${qs}` : ""}`);
  },

  getById(id) {
    return apiClient.get(`${TYPES_BASE}/${id}`);
  },

  create(data) {
    return apiClient.post(TYPES_BASE, data);
  },

  update(id, data) {
    return apiClient.put(`${TYPES_BASE}/${id}`, data);
  },

  delete(id) {
    return apiClient.delete(`${TYPES_BASE}/${id}`);
  },
};

export const variantOptionService = {
  getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`${OPTIONS_BASE}${qs ? `?${qs}` : ""}`);
  },

  getById(id) {
    return apiClient.get(`${OPTIONS_BASE}/${id}`);
  },

  create(data) {
    return apiClient.post(OPTIONS_BASE, data);
  },

  update(id, data) {
    return apiClient.put(`${OPTIONS_BASE}/${id}`, data);
  },

  delete(id) {
    return apiClient.delete(`${OPTIONS_BASE}/${id}`);
  },
};
