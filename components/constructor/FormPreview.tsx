"use client";

import {
  FieldInput,
  FieldSelect,
  FieldTextarea,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Surface } from "@/components/ui/surface";
import type { DraftField } from "@/lib/fields";
import { FIELD_TYPES } from "@/lib/types";

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
      <Surface
        variant="dashed"
        padding="md"
        className="text-sm text-muted-foreground"
      >
        Добавьте поля — здесь появится форма записи.
      </Surface>
    );
  }

  return (
    <Surface variant="subtle" padding="sm" className="space-y-3">
      {fields.map((field, index) => {
        const label = field.label.trim() || `Поле ${index + 1}`;

        return (
          <div key={field.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label className="text-sm">
                {label}
                {field.required && <span className="ml-0.5 text-primary">*</span>}
              </Label>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                {typeLabel(field.type)}
              </span>
            </div>

            {field.type === "select" ? (
              <FieldSelect disabled aria-label={label}>
                <option>— не выбрано —</option>
              </FieldSelect>
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
              <FieldTextarea
                disabled
                aria-label={label}
                placeholder="Длинный текст"
                className="min-h-16"
              />
            ) : field.type === "image" ? (
              <div className="flex h-10 items-center rounded-md border border-dashed border-border-strong px-3 text-sm text-muted-foreground">
                Картинка или ссылка
              </div>
            ) : (
              <FieldInput
                disabled
                aria-label={label}
                placeholder={
                  field.type === "number"
                    ? "0"
                    : field.type === "date"
                      ? "дд.мм.гггг"
                      : "Значение"
                }
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
    </Surface>
  );
}

export default FormPreview;
