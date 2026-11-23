"use client";

import { cn } from "@/lib/utils";

/**
 * Ключи иконок — те же, что понимает getModuleIcon().
 * Если сохранить эмодзи как есть, карточка покажет серую заглушку.
 */
export const ICON_CHOICES: { key: string; emoji: string; label: string }[] = [
  { key: "box", emoji: "📦", label: "Коробка" },
  { key: "wallet", emoji: "💰", label: "Деньги" },
  { key: "watch", emoji: "⌚", label: "Часы" },
  { key: "check-square", emoji: "✅", label: "Задачи" },
  { key: "clipboard-list", emoji: "📋", label: "Список" },
];

type IconPickerProps = {
  value: string;
  onChange: (key: string) => void;
  /** Крупные чипы в конструкторе, компактные в настройках. */
  size?: "sm" | "md";
  className?: string;
};

/**
 * Выбор иконки модуля. Раньше список и разметка были скопированы
 * в создание модуля и в настройки — с разными размерами и разной
 * структурой данных.
 */
export function IconPicker({
  value,
  onChange,
  size = "sm",
  className,
}: IconPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {ICON_CHOICES.map((choice) => {
        const selected = value === choice.key;

        return (
          <button
            key={choice.key}
            type="button"
            title={choice.label}
            aria-label={choice.label}
            aria-pressed={selected}
            onClick={() => onChange(choice.key)}
            className={cn(
              "flex items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              size === "md" ? "h-12 w-12 text-2xl" : "h-10 w-10 text-lg",
              selected
                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                : "border-border bg-card hover:border-primary"
            )}
          >
            <span aria-hidden>{choice.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}

export default IconPicker;
