import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import apiClient from "@/services/apiClient";
import { API_CONFIG } from "@/constants";
import toast from "react-hot-toast";

const EP = API_CONFIG.ENDPOINTS.ORDERS;

export const ORDER_KEYS = {
  all: ["orders"],
  lists: () => [...ORDER_KEYS.all, "list"],
  list: (params) => [...ORDER_KEYS.lists(), params],
  detail: (id) => [...ORDER_KEYS.all, "detail", id],
};

export function useOrders(params = {}) {
  return useQuery({
    queryKey: ORDER_KEYS.list(params),
    queryFn: async () => {
      const res = await apiClient.get(EP, { params });
      return res.data?.data ?? res.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id) {
  return useQuery({
    queryKey: ORDER_KEYS.detail(id),
    queryFn: async () => {
      const res = await apiClient.get(`${EP}/${id}`);
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderData) => apiClient.post(EP, orderData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
      toast.success("Order placed successfully");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Failed to place order"),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiClient.patch(`${EP}/${id}/cancel`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ORDER_KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
      toast.success("Order cancelled");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message ?? "Failed to cancel order"),
  });
}
