import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Theme: 'dark' (default) | 'light'
export const useTheme = create(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggle: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    { name: "reflexity-theme" },
  ),
);

// Hook to apply the theme class to <html> + body
export function useApplyTheme() {
  const theme = useTheme((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
    // Update theme-color meta for browser chrome
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f4f4f6" : "#050505");
  }, [theme]);
}
