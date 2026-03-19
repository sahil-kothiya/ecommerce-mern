import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import { API_CONFIG } from "@/constants";
import toast from "react-hot-toast";

export const CATEGORY_KEYS = {
  all: ["categories"],
  list: (params) => [...CATEGORY_KEYS.all, "list", params],
  detail: (id) => [...CATEGORY_KEYS.all, "detail", id],
  bySlug: (slug) => [...CATEGORY_KEYS.all, "slug", slug],
};

export const BRAND_KEYS = {
  all: ["brands"],
  list: (params) => [...BRAND_KEYS.all, "list", params],
  detail: (id) => [...BRAND_KEYS.all, "detail", id],
};

export const REVIEW_KEYS = {
  product: (productId, params) => ["reviews", "product", productId, params],
};

export const BANNER_KEYS = {
  active: ["banners", "active"],
};

export const COUPON_KEYS = {
  list: (params) => ["coupons", "list", params],
};

// ─── Categories ──────────────────────────────────────────────────────────
export function useCategories(params = {}) {
  return useQuery({
    queryKey: CATEGORY_KEYS.list(params),
    queryFn: async () => {
      const res = await apiClient.get(API_CONFIG.ENDPOINTS.CATEGORIES, {
        params,
      });
      return res.data?.data ?? res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCategoryBySlug(slug) {
  return useQuery({
    queryKey: CATEGORY_KEYS.bySlug(slug),
    queryFn: async () => {
      const res = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.CATEGORIES}/slug/${slug}`,
      );
      return res.data?.data ?? res.data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post(API_CONFIG.ENDPOINTS.CATEGORIES, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
      toast.success("Category created");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Failed to create category"),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      apiClient.put(`${API_CONFIG.ENDPOINTS.CATEGORIES}/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
      toast.success("Category updated");
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiClient.delete(`${API_CONFIG.ENDPOINTS.CATEGORIES}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
      toast.success("Category deleted");
    },
  });
}

// ─── Brands ──────────────────────────────────────────────────────────────
export function useBrands(params = {}) {
  return useQuery({
    queryKey: BRAND_KEYS.list(params),
    queryFn: async () => {
      const res = await apiClient.get(API_CONFIG.ENDPOINTS.BRANDS, { params });
      return res.data?.data ?? res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      apiClient.post(API_CONFIG.ENDPOINTS.BRANDS, data, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRAND_KEYS.all });
      toast.success("Brand created");
    },
  });
}

export function useUpdateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      apiClient.put(`${API_CONFIG.ENDPOINTS.BRANDS}/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRAND_KEYS.all });
      toast.success("Brand updated");
    },
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiClient.delete(`${API_CONFIG.ENDPOINTS.BRANDS}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BRAND_KEYS.all });
      toast.success("Brand deleted");
    },
  });
}

// ─── Reviews ─────────────────────────────────────────────────────────────
export function useProductReviews(productId, params = {}) {
  return useQuery({
    queryKey: REVIEW_KEYS.product(productId, params),
    queryFn: async () => {
      const res = await apiClient.get(API_CONFIG.ENDPOINTS.REVIEWS, {
        params: { product: productId, ...params },
      });
      return res.data?.data ?? res.data;
    },
    enabled: !!productId,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post(API_CONFIG.ENDPOINTS.REVIEWS, data),
    onSuccess: (_, { product }) => {
      qc.invalidateQueries({ queryKey: ["reviews", "product", product] });
      toast.success("Review submitted");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Failed to submit review"),
  });
}

// ─── Banners ─────────────────────────────────────────────────────────────
export function useActiveBanners() {
  return useQuery({
    queryKey: BANNER_KEYS.active,
    queryFn: async () => {
      const res = await apiClient.get(API_CONFIG.ENDPOINTS.BANNERS, {
        params: { status: "active", limit: 5 },
      });
      return res.data?.data ?? res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Coupons ─────────────────────────────────────────────────────────────
export function useCoupons(params = {}) {
  return useQuery({
    queryKey: COUPON_KEYS.list(params),
    queryFn: async () => {
      const res = await apiClient.get(API_CONFIG.ENDPOINTS.COUPONS, { params });
      return res.data?.data ?? res.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: (code) =>
      apiClient.post(`${API_CONFIG.ENDPOINTS.COUPONS}/validate`, { code }),
  });
}
