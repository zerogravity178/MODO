"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DraftField } from "@/lib/fields";
import { FIELD_TYPES } from "@/lib/types";

const selectClass =
  "flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 sm:h-9 sm:text-sm";

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
      <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        Добавьте поля — здесь появится форма записи.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 dark:border-neutral-800 dark:bg-neutral-900/40">
      {fields.map((field, index) => {
        const label = field.label.trim() || `Поле ${index + 1}`;

        return (
          <div key={field.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label className="text-sm">
                {label}
                {field.required && (
                  <span className="ml-0.5 text-[#c2410c] dark:text-[#f97316]">*</span>
                )}
              </Label>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                {typeLabel(field.type)}
              </span>
            </div>

            {field.type === "select" ? (
              <select className={selectClass} disabled aria-label={label}>
                <option>— не выбрано —</option>
              </select>
            ) : field.type === "boolean" ? (
              <div className="flex min-h-9 items-center gap-2 rounded-md border border-neutral-300 px-3 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                <input
                  type="checkbox"
                  disabled
                  aria-label={label}
                  className="h-4 w-4 rounded border-neutral-300 accent-[#f97316]"
                />
                Да
              </div>
            ) : field.type === "textarea" ? (
              <div className="min-h-16 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500">
                Длинный текст
              </div>
            ) : field.type === "image" ? (
              <div className="flex h-10 items-center rounded-md border border-dashed border-neutral-300 px-3 text-sm text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
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
                className="cursor-not-allowed bg-white dark:bg-neutral-900"
              />
            )}
          </div>
        );
      })}

      <div className="flex gap-2 pt-1">
        <span className="inline-flex h-9 items-center rounded-md bg-[#f97316] px-3 text-sm font-medium text-white">
          Добавить
        </span>
        <span className="inline-flex h-9 items-center rounded-md border border-neutral-300 px-3 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          Отмена
        </span>
      </div>
    </div>
  );
}

export default FormPreview;
