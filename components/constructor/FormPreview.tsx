"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DraftField } from "@/lib/fields";
import { FIELD_TYPES } from "@/lib/types";

const selectClass =
  "flex h-10 w-full rounded-md border border-border-strong bg-card px-3 py-2 text-base text-muted-foreground sm:h-9 sm:text-sm";

function typeLabel(type: DraftField["type"]): string {
  return FIELD_TYPES.find((item) => item.value === type)?.label ?? type;
}

/**
 * Как форма записи будет выглядеть на самом деле. Поля неактивны —
 * это предпросмотр, а не ввод данных.
 */
export function FormPreview({ fields }: { fields: DraftField[] }) {
  if (fields.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Добавьте поля — здесь появится форма записи.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface/60 p-3 dark:bg-card/40">
      {fields.map((field, index) => {
        const label = field.label.trim() || `Поле ${index + 1}`;

        return (
          <div key={field.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label className="text-sm">
                {label}
                {field.required && (
                  <span className="ml-0.5 text-primary">*</span>
                )}
              </Label>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                {typeLabel(field.type)}
              </span>
            </div>

            {field.type === "select" ? (
              <select className={selectClass} disabled aria-label={label}>
                <option>— не выбрано —</option>
              </select>
            ) : field.type === "boolean" ? (
              <div className="flex min-h-9 items-center gap-2 rounded-md border border-border-strong px-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  disabled
                  aria-label={label}
                  className="h-4 w-4 rounded border-border-strong accent-primary"
                />
                Да
              </div>
            ) : field.type === "textarea" ? (
              <div className="min-h-16 rounded-md border border-border-strong bg-card px-3 py-2 text-sm text-muted-foreground">
                Длинный текст
              </div>
            ) : field.type === "image" ? (
              <div className="flex h-10 items-center rounded-md border border-dashed border-border-strong px-3 text-sm text-muted-foreground">
                Картинка или ссылка
              </div>
            ) : (
              <Input
                disabled
                aria-label={label}
                placeholder={
                  field.type === "number"
                    ? "0"
                    : field.type === "date"
                      ? "дд.мм.гггг"
                      : "Значение"
                }
                className="cursor-not-allowed bg-card"
              />
            )}
          </div>
        );
      })}

      <div className="flex gap-2 pt-1">
        <span className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
          Добавить
        </span>
        <span className="inline-flex h-9 items-center rounded-md border border-border-strong px-3 text-sm text-muted-foreground">
          Отмена
        </span>
      </div>
    </div>
  );
}

export default FormPreview;
