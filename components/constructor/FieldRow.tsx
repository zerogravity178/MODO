"use client";

import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldType } from "@/lib/types";

export type DraftField = {
  /** Стабильный ключ строки в интерфейсе — в базу не попадает. */
  key: number;
  label: string;
  type: FieldType;
  /** «Еда, Транспорт» — разбирается в options уже при сохранении. */
  optionsText: string;
};

export const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "number", label: "Число" },
  { value: "date", label: "Дата" },
  { value: "select", label: "Список" },
  { value: "image", label: "Картинка" },
];

type FieldRowProps = {
  field: DraftField;
  index: number;
  onChange: (key: number, patch: Partial<DraftField>) => void;
  onRemove: (key: number) => void;
};

export function FieldRow({ field, index, onChange, onRemove }: FieldRowProps) {
  const labelId = `field-label-${field.key}`;
  const typeId = `field-type-${field.key}`;
  const optionsId = `field-options-${field.key}`;

  return (
    <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          Поле {index + 1}
        </p>
        <button
          type="button"
          onClick={() => onRemove(field.key)}
          aria-label={`Удалить поле ${index + 1}`}
          className="rounded-md p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
        <div className="space-y-1">
          <Label
            htmlFor={labelId}
            className="text-xs font-normal text-neutral-500"
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
            className="focus-visible:ring-[#f97316]"
          />
        </div>

        <div className="space-y-1">
          <Label
            htmlFor={typeId}
            className="text-xs font-normal text-neutral-500"
          >
            Тип
          </Label>
          <select
            id={typeId}
            value={field.type}
            onChange={(event) =>
              onChange(field.key, { type: event.target.value as FieldType })
            }
            className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2"
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
            className="text-xs font-normal text-neutral-500"
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
            className="focus-visible:ring-[#f97316]"
          />
        </div>
      )}
    </div>
  );
}

export default FieldRow;
