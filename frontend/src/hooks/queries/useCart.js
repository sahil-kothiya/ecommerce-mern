import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import { API_CONFIG } from "@/constants";
import toast from "react-hot-toast";

const EP = API_CONFIG.ENDPOINTS.CART;

export const CART_KEYS = {
  cart: ["cart"],
};

export function useCart() {
  return useQuery({
    queryKey: CART_KEYS.cart,
    queryFn: async () => {
      const res = await apiClient.get(EP);
      return res.data?.data ?? res.data;
    },
    staleTime: 1000 * 60,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item) => apiClient.post(EP, item),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CART_KEYS.cart });
      window.dispatchEvent(new Event("cart:changed"));
      toast.success("Added to cart");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Failed to add to cart"),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }) =>
      apiClient.put(`${EP}/${id}`, { quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CART_KEYS.cart }),
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Failed to update cart"),
  });
}

export function useRemoveFromCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiClient.delete(`${EP}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: CART_KEYS.cart }),
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Failed to remove from cart"),
  });
}

export function useClearCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete(EP),
    onSuccess: () => qc.invalidateQueries({ queryKey: CART_KEYS.cart }),
  });
}
