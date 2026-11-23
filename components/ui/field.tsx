import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Одинаковое оформление всех полей ввода: input, select, textarea
 * и подложек для нестандартных контролов (чекбокс «Да/Нет»).
 *
 * Раньше каждая форма писала свои классы: четыре копии selectClass
 * и отдельные строки для textarea и чекбокса. Теперь класс один.
 */
const controlVariants = cva(
  [
    "w-full rounded-md border bg-card text-foreground",
    "placeholder:text-muted-foreground",
    "transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      /**
       * `compact` — та же высота на телефоне, но мельче и ниже на десктопе:
       * так панель фильтров и конструктор не раздуваются.
       */
      size: {
        default: "h-10 px-3 py-2 text-base sm:text-sm",
        compact: "h-10 px-3 py-2 text-base sm:h-9 sm:text-sm",
      },
      /** Красная граница, когда поле не прошло проверку. */
      invalid: {
        true: "border-danger",
        false: "border-border-strong",
      },
    },
    defaultVariants: {
      size: "default",
      invalid: false,
    },
  }
);

type ControlVariantProps = VariantProps<typeof controlVariants>;

/**
 * `size` у input/select — это ещё и штатный HTML-атрибут (число ширина в
 * символах). Мы используем это имя под свой вариант размера, поэтому
 * нативный атрибут из пропсов убираем — иначе типы конфликтуют.
 */
const FieldInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "size"> & ControlVariantProps
>(({ className, size, invalid, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(controlVariants({ size, invalid }), className)}
    {...props}
  />
));
FieldInput.displayName = "FieldInput";

const FieldSelect = React.forwardRef<
  HTMLSelectElement,
  Omit<React.ComponentProps<"select">, "size"> & ControlVariantProps
>(({ className, size, invalid, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(controlVariants({ size, invalid }), className)}
    {...props}
  />
));
FieldSelect.displayName = "FieldSelect";

const FieldTextarea = React.forwardRef<
  HTMLTextAreaElement,
  Omit<React.ComponentProps<"textarea">, "size"> & ControlVariantProps
>(({ className, size, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      controlVariants({ size, invalid }),
      // Текстоваяarea тянется по содержимому: фиксированную высоту не задаём.
      "h-auto min-h-10 resize-y",
      className
    )}
    {...props}
  />
));
FieldTextarea.displayName = "FieldTextarea";

type FieldProps = {
  /** id контрола — связывает подпись и описание с полем. */
  id: string;
  label?: React.ReactNode;
  /** Звёздочка после подписи. Проверку обязательности делает форма. */
  required?: boolean;
  /** Пояснение под полем. */
  description?: React.ReactNode;
  /** Сообщение об ошибке: заменяет описание и красит рамку. */
  error?: React.ReactNode;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
};

/**
 * Обёртка поля: подпись, описание, сообщение об ошибке.
 *
 * Контрол передаётся готовым (`FieldInput`, `FieldSelect`, `FieldTextarea`)
 * или любым своим элементом — доступность (aria-describedby, aria-invalid)
 * проставляется автоматически.
 */
export function Field({
  id,
  label,
  required,
  description,
  error,
  className,
  labelClassName,
  children,
}: FieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");

  let control: React.ReactNode = children;

  if (React.isValidElement(children)) {
    const childProps = children.props as { id?: string };
    // Обёртку (label с чекбоксом внутри, div с полем и кнопкой) не трогаем:
    // если проставить id ещё и ей, в документе окажется два одинаковых id.
    // Смотрим на тип элемента, а не на наличие детей: у <select> дети — опции.
    const childType = children.type;
    const isLeafControl = childType !== "label" && childType !== "div";

    control = React.cloneElement(
      children as React.ReactElement<Record<string, unknown>>,
      isLeafControl
        ? {
            // Подпись ссылается на id — контрол должен этот id иметь.
            id: childProps.id ?? id,
            "aria-describedby": describedBy || undefined,
            "aria-invalid": error ? true : undefined,
          }
        : {}
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className={labelClassName}>
          {label}
          {required && <span className="ml-0.5 text-primary">*</span>}
        </Label>
      )}

      {control}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        description && (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        )
      )}
    </div>
  );
}

export {
  FieldInput,
  FieldSelect,
  FieldTextarea,
  controlVariants,
};
export type { ControlVariantProps };
