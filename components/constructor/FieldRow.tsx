"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";

import { Field, FieldInput, FieldSelect } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import type { DraftField } from "@/lib/fields";
import { FIELD_TYPES, type FieldType } from "@/lib/types";

export type { DraftField };

export const FIELD_TYPE_OPTIONS = FIELD_TYPES;

type FieldRowProps = {
  field: DraftField;
  index: number;
  total: number;
  onChange: (key: number, patch: Partial<DraftField>) => void;
  onRemove: (key: number) => void;
  onMove: (key: number, direction: -1 | 1) => void;
};

export function FieldRow({
  field,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: FieldRowProps) {
  const labelId = `field-label-${field.key}`;
  const typeId = `field-type-${field.key}`;
  const optionsId = `field-options-${field.key}`;
  const requiredId = `field-required-${field.key}`;

  return (
    <Surface padding="sm" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Поле {index + 1}
        </p>

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onMove(field.key, -1)}
            disabled={index === 0}
            aria-label={`Поднять поле ${index + 1}`}
            title="Выше"
            className="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 [@media(hover:none)]:p-2.5"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(field.key, 1)}
            disabled={index === total - 1}
            aria-label={`Опустить поле ${index + 1}`}
            title="Ниже"
            className="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 [@media(hover:none)]:p-2.5"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(field.key)}
            aria-label={`Удалить поле ${index + 1}`}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(hover:none)]:p-2.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
        <Field
          id={labelId}
          label="Название"
          labelClassName="text-xs font-normal text-muted-foreground"
        >
          <FieldInput
            id={labelId}
            value={field.label}
            placeholder="Например, Сумма"
            onChange={(event) =>
              onChange(field.key, { label: event.target.value })
            }
          />
        </Field>

        <Field
          id={typeId}
          label="Тип"
          labelClassName="text-xs font-normal text-muted-foreground"
        >
          <FieldSelect
            id={typeId}
            value={field.type}
            onChange={(event) =>
              onChange(field.key, { type: event.target.value as FieldType })
            }
          >
            {FIELD_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FieldSelect>
        </Field>
      </div>

      {field.type === "select" && (
        <Field
          id={optionsId}
          label="Варианты через запятую"
          labelClassName="text-xs font-normal text-muted-foreground"
        >
          <FieldInput
            id={optionsId}
            value={field.optionsText}
            placeholder="Еда, Транспорт, Жильё"
            onChange={(event) =>
              onChange(field.key, { optionsText: event.target.value })
            }
          />
        </Field>
      )}

      <label
        htmlFor={requiredId}
        className="flex min-h-9 w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground"
      >
        <input
          id={requiredId}
          type="checkbox"
          checked={field.required}
          onChange={(event) =>
            onChange(field.key, { required: event.target.checked })
          }
          className="h-4 w-4 rounded border-border-strong accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        Обязательное
      </label>
    </Surface>
  );
}

export default FieldRow;
