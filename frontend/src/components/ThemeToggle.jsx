import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

export default function ThemeToggle({ compact = false }) {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={`relative inline-flex items-center rounded-full theme-toggle-btn ${
        compact ? "w-11 h-6" : "w-14 h-7"
      }`}
      data-theme={theme}
      data-testid="theme-toggle"
    >
      <span className="sr-only">Toggle theme</span>
      <span
        className={`theme-toggle-thumb absolute top-1/2 -translate-y-1/2 ${
          compact ? "w-5 h-5" : "w-6 h-6"
        } rounded-full flex items-center justify-center transition-transform`}
        style={{
          transform: `translate(${isDark ? "2px" : compact ? "22px" : "30px"}, -50%)`,
        }}
      >
        {isDark ? (
          <Moon size={compact ? 11 : 13} className="text-neutral-900" strokeWidth={2.4} />
        ) : (
          <Sun size={compact ? 11 : 13} className="text-amber-500" strokeWidth={2.4} />
        )}
      </span>
    </button>
  );
}
