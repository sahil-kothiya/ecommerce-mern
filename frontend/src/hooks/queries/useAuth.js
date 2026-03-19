import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import authService from "@/services/authService";
import apiClient from "@/services/apiClient";
import { API_CONFIG } from "@/constants";
import { useAuthStore } from "@/store/authStore";

export const AUTH_KEYS = {
  me: ["auth", "me"],
};

export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_KEYS.me,
    queryFn: () => authService.getCurrentUser(),
    staleTime: Infinity,
    retry: false,
    enabled: useAuthStore.getState().isAuthenticated,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password, rememberMe }) =>
      authService.login(email, password, rememberMe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userData) => authService.register(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email) => authService.forgotPassword(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword, confirmPassword }) =>
      authService.resetPassword(token, newPassword, confirmPassword),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword, confirmPassword }) =>
      authService.changePassword(currentPassword, newPassword, confirmPassword),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileData) => authService.updateProfile(profileData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_KEYS.me });
    },
  });
}

// ─── Addresses ─────────────────────────────────────────────────────────────
const AUTH_EP = API_CONFIG.ENDPOINTS.AUTH;

export const ADDRESS_KEYS = { all: ["auth", "addresses"] };

export function useAddresses() {
  return useQuery({
    queryKey: ADDRESS_KEYS.all,
    queryFn: async () => {
      const res = await apiClient.get(`${AUTH_EP}/addresses`);
      return res.data?.data?.addresses ?? [];
    },
  });
}

export function useAddAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiClient.post(`${AUTH_EP}/addresses`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADDRESS_KEYS.all }),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ addressId, ...payload }) =>
      apiClient.put(`${AUTH_EP}/addresses/${addressId}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADDRESS_KEYS.all }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (addressId) =>
      apiClient.delete(`${AUTH_EP}/addresses/${addressId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADDRESS_KEYS.all }),
  });
}
