import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Единая поверхность: карточки модулей и записей, секции настроек,
 * пустые состояния, блоки конструктора.
 *
 * Раньше один и тот же набор классов (`rounded-xl border border-border
 * bg-card p-4`) был скопирован в восьми местах — теперь он живёт здесь.
 * Компонент без хуков: его используют и серверные страницы.
 */
const surfaceVariants = cva("rounded-xl border", {
  variants: {
    /** Поверхность: карточка на фоне, подложка панели или пунктирная заглушка. */
    variant: {
      card: "border-border bg-card",
      subtle: "border-border bg-surface",
      dashed: "border-dashed border-border bg-surface",
      danger: "border-danger/30 bg-danger/10",
      plain: "border-border",
    },
    padding: {
      none: "",
      sm: "p-3",
      md: "p-4",
    },
    /** Наведение подсвечивает границу — для кликабельных карточек. */
    interactive: {
      true: "transition hover:border-primary/60 hover:shadow-sm",
      false: "",
    },
  },
  defaultVariants: {
    variant: "card",
    padding: "md",
    interactive: false,
  },
});

type SurfaceProps = React.ComponentProps<"div"> &
  VariantProps<typeof surfaceVariants>;

function Surface({
  className,
  variant,
  padding,
  interactive,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={cn(
        surfaceVariants({ variant, padding, interactive }),
        className
      )}
      {...props}
    />
  );
}

export { Surface, surfaceVariants };
export type { SurfaceProps };
