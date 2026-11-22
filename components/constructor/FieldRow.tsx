"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
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
        <div className="space-y-1">
          <Label
            htmlFor={labelId}
            className="text-xs font-normal text-muted-foreground"
          >
            Название
          </Label>
          <Input
            id={labelId}
            value={field.label}
            placeholder="Например, Сумма"
            onChange={(event) =>
              onChange(field.key, { label: event.target.value })
            }
            className="focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <Label
            htmlFor={typeId}
            className="text-xs font-normal text-muted-foreground"
          >
            Тип
          </Label>
          <select
            id={typeId}
            value={field.type}
            onChange={(event) =>
              onChange(field.key, { type: event.target.value as FieldType })
            }
            className="flex h-10 w-full rounded-md border border-border-strong bg-card px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-9 sm:text-sm"
          >
            {FIELD_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {field.type === "select" && (
        <div className="space-y-1">
          <Label
            htmlFor={optionsId}
            className="text-xs font-normal text-muted-foreground"
          >
            Варианты через запятую
          </Label>
          <Input
            id={optionsId}
            value={field.optionsText}
            placeholder="Еда, Транспорт, Жильё"
            onChange={(event) =>
              onChange(field.key, { optionsText: event.target.value })
            }
            className="focus-visible:ring-ring"
          />
        </div>
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
    </div>
  );
}

export default FieldRow;
