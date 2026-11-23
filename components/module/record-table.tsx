"use client";

import { Trash2 } from "lucide-react";

import { Surface } from "@/components/ui/surface";
import { withData } from "@/lib/records";
import { formatFieldValue, type FieldDef, type RecordRow } from "@/lib/types";

type RecordTableProps = {
  fields: FieldDef[];
  items: ReturnType<typeof withData>;
  imageUrls?: Record<string, Record<string, string>>;
  onEdit: (record: RecordRow) => void;
  onDelete: (record: RecordRow) => void;
};

/** Табличный вид: строка — запись, клик по строке открывает правку. */
export function RecordTable({
  fields,
  items,
  imageUrls,
  onEdit,
  onDelete,
}: RecordTableProps) {
  return (
    <Surface
      variant="plain"
      padding="none"
      className="relative overflow-x-auto"
    >
      <table className="w-full border-collapse text-sm">
        <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {fields.map((field) => (
              <th key={field.id} className="px-3 py-2 font-medium">
                {field.label}
              </th>
            ))}
            <th className="px-3 py-2 font-medium">Создано</th>
            <th className="w-10 px-3 py-2">
              <span className="sr-only">Действия</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ record, data }) => (
            <tr
              key={record.id}
              onClick={() => onEdit(record)}
              className="group cursor-pointer border-t border-border align-middle transition hover:bg-accent"
            >
              {fields.map((field) => {
                const value = data[field.id];
                const src =
                  field.type === "image"
                    ? (imageUrls?.[record.id]?.[field.id] ??
                      (typeof value === "string" && value.startsWith("http")
                        ? value
                        : undefined))
                    : undefined;

                return (
                  <td key={field.id} className="px-3 py-2 text-foreground">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={field.label}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : field.type === "image" && value ? (
                      <span className="text-xs text-muted-foreground">
                        файл
                      </span>
                    ) : (
                      formatFieldValue(value)
                    )}
                  </td>
                );
              })}
              <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                {record.created_at
                  ? new Date(record.created_at).toLocaleDateString("ru-RU")
                  : "—"}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDelete(record);
                  }}
                  aria-label="Удалить запись"
                  title="Удалить запись"
                  className="rounded-md p-2 text-muted-foreground opacity-0 transition hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 [@media(hover:none)]:p-2.5 [@media(hover:none)]:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Surface>
  );
}

export default RecordTable;
