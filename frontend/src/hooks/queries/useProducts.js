import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import { API_CONFIG } from "@/constants";
import toast from "react-hot-toast";

const EP = API_CONFIG.ENDPOINTS.PRODUCTS;
const ADMIN_EP = API_CONFIG.ENDPOINTS.ADMIN_PRODUCTS;

export const PRODUCT_KEYS = {
  all: ["products"],
  lists: () => [...PRODUCT_KEYS.all, "list"],
  list: (params) => [...PRODUCT_KEYS.lists(), params],
  detail: (slug) => [...PRODUCT_KEYS.all, "detail", slug],
  featured: (limit) => [...PRODUCT_KEYS.all, "featured", limit],
  search: (q, filters) => [...PRODUCT_KEYS.all, "search", q, filters],
  adminList: (params) => ["admin", "products", "list", params],
  adminDetail: (id) => ["admin", "products", "detail", id],
};

export function useProducts(params = {}) {
  return useQuery({
    queryKey: PRODUCT_KEYS.list(params),
    queryFn: async () => {
      const res = await apiClient.get(EP, { params });
      return res.data?.data ?? res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  });
}

export function useProduct(slug) {
  return useQuery({
    queryKey: PRODUCT_KEYS.detail(slug),
    queryFn: async () => {
      const res = await apiClient.get(`${EP}/${slug}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60,
  });
}

export function useFeaturedProducts(limit = 8) {
  return useQuery({
    queryKey: PRODUCT_KEYS.featured(limit),
    queryFn: async () => {
      const res = await apiClient.get(`${EP}/featured`, { params: { limit } });
      return res.data?.data ?? res.data;
    },
    staleTime: 1000 * 120,
  });
}

export function useProductSearch(q, filters = {}) {
  return useQuery({
    queryKey: PRODUCT_KEYS.search(q, filters),
    queryFn: async () => {
      const res = await apiClient.get(`${EP}/search`, {
        params: { q, ...filters },
      });
      return res.data?.data ?? res.data;
    },
    enabled: !!q && q.length >= 2,
    staleTime: 1000 * 30,
  });
}

export function useAdminProducts(params = {}) {
  return useQuery({
    queryKey: PRODUCT_KEYS.adminList(params),
    queryFn: async () => {
      const res = await apiClient.get(ADMIN_EP, { params });
      return res.data?.data ?? res.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminProduct(id) {
  return useQuery({
    queryKey: PRODUCT_KEYS.adminDetail(id),
    queryFn: async () => {
      const res = await apiClient.get(`${ADMIN_EP}/${id}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) =>
      apiClient.post(ADMIN_EP, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.lists() });
      qc.invalidateQueries({ queryKey: ["admin", "products", "list"] });
      toast.success("Product created successfully");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Failed to create product"),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }) =>
      apiClient.put(`${ADMIN_EP}/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.lists() });
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.adminDetail(id) });
      toast.success("Product updated successfully");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Failed to update product"),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiClient.delete(`${ADMIN_EP}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.lists() });
      qc.invalidateQueries({ queryKey: ["admin", "products", "list"] });
      toast.success("Product deleted successfully");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Failed to delete product"),
  });
}
