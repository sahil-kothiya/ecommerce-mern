import apiClient from "./apiClient";
import { API_CONFIG } from "../constants";

const BASE = API_CONFIG.ENDPOINTS.USERS;

const userService = {
  getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiClient.get(`${BASE}${qs ? `?${qs}` : ""}`);
  },

  getById(id) {
    return apiClient.get(`${BASE}/${id}`);
  },

  create(userData) {
    return apiClient.post(BASE, userData);
  },

  update(id, userData) {
    return apiClient.put(`${BASE}/${id}`, userData);
  },

  delete(id) {
    return apiClient.delete(`${BASE}/${id}`);
  },

  updateRole(id, role) {
    return apiClient.put(`${BASE}/${id}/role`, { role });
  },
};

export default userService;
