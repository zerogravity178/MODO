import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Плашка с иконкой модуля: одинаковый размер, фон и цвет во всех местах —
 * карточка модуля, шапка модуля, пустое состояние, шапка настроек.
 *
 * Раньше `<span className="flex h-11 w-11 … bg-primary/10 text-primary">`
 * повторялся в пяти файлах, а в пустом состоянии размер был другим.
 */
const iconBadgeVariants = cva(
  "flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
  {
    variants: {
      size: {
        /** Плитки шаблонов на главной. */
        sm: "h-10 w-10",
        /** Карточки модулей и записи. */
        md: "h-11 w-11",
        /** Заголовок экрана модуля и настроек. */
        lg: "h-12 w-12",
        /** Круглая плашка в пустых состояниях. */
        empty: "h-12 w-12 rounded-full",
      },
    },
    defaultVariants: {
      size: "lg",
    },
  }
);

/** Размер иконки подбирается под плашку: крупнее плашка — крупнее глиф. */
const ICON_SIZE: Record<NonNullable<IconBadgeSize>, string> = {
  sm: "h-5 w-5",
  md: "h-5 w-5",
  lg: "h-5 w-5",
  empty: "h-5 w-5",
};

type IconBadgeSize = VariantProps<typeof iconBadgeVariants>["size"];

type IconBadgeProps = {
  /** Готовая lucide-иконка — её выбирает вызывающий через getModuleIcon. */
  icon: React.ComponentType<{ className?: string }>;
  size?: IconBadgeSize;
  className?: string;
};

export function IconBadge({ icon: Icon, size, className }: IconBadgeProps) {
  return (
    <span className={cn(iconBadgeVariants({ size }), className)}>
      <Icon className={ICON_SIZE[size ?? "lg"]} />
    </span>
  );
}

export { iconBadgeVariants };
export type { IconBadgeProps, IconBadgeSize };
