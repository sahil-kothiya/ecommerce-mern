import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUIStore = create(
  persist(
    (set) => ({
      theme: "light",
      sidebarOpen: false,
      notifications: [],

      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      addNotification: (notification) =>
        set((s) => ({
          notifications: [
            ...s.notifications,
            { id: crypto.randomUUID(), createdAt: Date.now(), ...notification },
          ].slice(-20),
        })),

      removeNotification: (id) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: "ui",
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
