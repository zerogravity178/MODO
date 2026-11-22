"use client";

import { Plus } from "lucide-react";

import { FieldRow, type DraftField } from "@/components/constructor/FieldRow";
import { Button } from "@/components/ui/button";

type FieldListProps = {
  fields: DraftField[];
  onChange: (key: number, patch: Partial<DraftField>) => void;
  onAdd: () => void;
  onRemove: (key: number) => void;
};

export function FieldList({
  fields,
  onChange,
  onAdd,
  onRemove,
}: FieldListProps) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Поля модуля</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Что будет храниться в каждой записи.
        </p>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          Пока нет полей — добавьте хотя бы одно.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <FieldRow
              key={field.key}
              field={field}
              index={index}
              onChange={onChange}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={onAdd}
        className="w-full border-dashed border-neutral-300 text-neutral-600 hover:border-[#f97316] hover:text-[#f97316] dark:border-neutral-700 dark:text-neutral-300"
      >
        <Plus className="mr-1 h-4 w-4" />
        Добавить поле
      </Button>
    </section>
  );
}

export default FieldList;
