import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      clearUser: () => set({ user: null, isAuthenticated: false }),

      isAdmin: () => get().user?.role === "admin",

      isCustomer: () => ["user", "customer"].includes(get().user?.role),
    }),
    {
      name: "auth",
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.user;
        }
      },
    },
  ),
);
