"use client";

import { Plus } from "lucide-react";

import { FieldRow } from "@/components/constructor/FieldRow";
import { Button } from "@/components/ui/button";
import {
  moveItem,
  type DraftField,
} from "@/lib/fields";

type FieldListProps = {
  fields: DraftField[];
  onChange: (key: number, patch: Partial<DraftField>) => void;
  onAdd: () => void;
  onRemove: (key: number) => void;
  /** Если не передан — стрелки перестановки не показываются. */
  onReorder?: (fields: DraftField[]) => void;
};

export function FieldList({
  fields,
  onChange,
  onAdd,
  onRemove,
  onReorder,
}: FieldListProps) {
  function handleMove(key: number, direction: -1 | 1) {
    if (!onReorder) return;
    const index = fields.findIndex((field) => field.key === key);
    if (index === -1) return;
    onReorder(moveItem(fields, index, direction));
  }

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Поля модуля
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Что будет храниться в каждой записи. Порядок полей — порядок в форме.
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
              total={fields.length}
              onChange={onChange}
              onRemove={onRemove}
              onMove={handleMove}
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
