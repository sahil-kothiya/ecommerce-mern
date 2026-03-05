import apiClient from "./apiClient";
import { API_CONFIG } from "../constants";

const BASE = API_CONFIG.ENDPOINTS.CATEGORIES;

const categoryService = {
  getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`${BASE}${qs ? `?${qs}` : ""}`);
  },

  getTree(maxDepth = 3) {
    return apiClient.get(`${BASE}/tree?maxDepth=${maxDepth}`);
  },

  getFlat() {
    return apiClient.get(`${BASE}/flat`);
  },

  getFilters() {
    return apiClient.get(`${BASE}/filters`);
  },

  getNavigation(maxLevels = 2) {
    return apiClient.get(`${BASE}/navigation?maxLevels=${maxLevels}`);
  },

  getById(id, includeChildren = false) {
    return apiClient.get(
      `${BASE}/${id}${includeChildren ? "?includeChildren=true" : ""}`,
    );
  },

  getBySlug(slug, includeChildren = false) {
    return apiClient.get(
      `${BASE}/slug/${slug}${includeChildren ? "?includeChildren=true" : ""}`,
    );
  },

  getBreadcrumb(id) {
    return apiClient.get(`${BASE}/${id}/breadcrumb`);
  },

  getProducts(id, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`${BASE}/${id}/products${qs ? `?${qs}` : ""}`);
  },

  getBrands(id) {
    return apiClient.get(`${BASE}/${id}/brands`);
  },

  create(formData) {
    return apiClient.upload(BASE, formData);
  },

  update(id, formData) {
    return apiClient.upload(`${BASE}/${id}`, formData);
  },

  delete(id) {
    return apiClient.delete(`${BASE}/${id}`);
  },

  bulkReorder(updates) {
    return apiClient.post(`${BASE}/reorder`, { updates });
  },
};

export default categoryService;
