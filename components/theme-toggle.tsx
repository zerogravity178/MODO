"use client";

import { Moon, Sun } from "lucide-react";

/**
 * Обе иконки в разметке, видимость решает CSS (`dark:`).
 * Так нет расхождения между серверной и клиентской разметкой.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");

    root.classList.toggle("dark", next);

    try {
      localStorage.setItem("modo-theme", next ? "dark" : "light");
    } catch {
      // Приватный режим — тема просто не запомнится.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Переключить тему"
      title="Светлая или тёмная тема"
      className="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </button>
  );
}

export default ThemeToggle;
