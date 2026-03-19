import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import { API_CONFIG } from "@/constants";
import toast from "react-hot-toast";

const EP = API_CONFIG.ENDPOINTS.WISHLIST;

export const WISHLIST_KEYS = {
  wishlist: ["wishlist"],
};

export function useWishlist() {
  return useQuery({
    queryKey: WISHLIST_KEYS.wishlist,
    queryFn: async () => {
      const res = await apiClient.get(EP);
      return res.data?.data ?? res.data;
    },
  });
}

export function useAddToWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId) => apiClient.post(EP, { productId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WISHLIST_KEYS.wishlist });
      window.dispatchEvent(new Event("wishlist:changed"));
      toast.success("Added to wishlist");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Failed to update wishlist"),
  });
}

export function useRemoveFromWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId) => apiClient.delete(`${EP}/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WISHLIST_KEYS.wishlist });
      window.dispatchEvent(new Event("wishlist:changed"));
      toast.success("Removed from wishlist");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Failed to update wishlist"),
  });
}
