"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import styles from "./theme-toggle.module.css";

const OPTIONS = [
  { value: "light", label: "Light theme", Icon: Sun },
  { value: "dark", label: "Dark theme", Icon: Moon },
  { value: "system", label: "System theme", Icon: Laptop },
] as const;

const subscribe = () => () => {};

// Light, dark or system theme. The choice is a display preference that
// next-themes keeps in localStorage and applies before the page paints.
// The stored theme is unknown on the server, so the buttons render with
// none pressed until hydration: the control keeps its size and nothing
// shifts, and the server and client markup match.
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={`${styles.toggle} ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          className={styles.option}
          aria-label={label}
          title={label}
          aria-pressed={hydrated ? theme === value : undefined}
          onClick={() => setTheme(value)}
        >
          <Icon size={16} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
