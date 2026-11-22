"use client";

import { Trash2 } from "lucide-react";

import { formatFieldValue, type FieldDef } from "@/lib/types";
import { cn } from "@/lib/utils";

type RecordCardProps = {
  fields: FieldDef[];
  data: Record<string, unknown>;
  className?: string;
  onEdit?: () => void;
  onDelete?: () => void;
};

/** Сколько полей максимум показываем в карточке — остальное в режиме «Таблица». */
const PREVIEW_LIMIT = 4;

/** Пустое значение: null, "", пробелы, пустой массив. Ноль и false — не пустые. */
function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function RecordCard({
  fields,
  data,
  className,
  onEdit,
  onDelete,
}: RecordCardProps) {
  // Сначала выбрасываем пустые поля, потом ограничиваем количество:
  // иначе карточка с двумя заполненными полями из шести выглядела бы полупустой.
  const preview = fields
    .filter((field) => !isBlank(data[field.id]))
    .slice(0, PREVIEW_LIMIT);

  return (
    <div
      className={cn(
        "group relative space-y-2 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-[#f97316]/50 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
        onDelete && "pr-10",
        onEdit && "cursor-pointer",
        className
      )}
      {...(onEdit
        ? {
            role: "button",
            tabIndex: 0,
            onClick: onEdit,
            onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onEdit();
              }
            },
          }
        : {})}
    >
      {onDelete && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          aria-label="Удалить запись"
          title="Удалить запись"
          className="absolute right-2 top-2 rounded-md p-2 text-neutral-500 [@media(hover:none)]:p-2.5 opacity-0 transition hover:bg-red-50 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 [@media(hover:none)]:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {preview.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {fields.length === 0 ? "У модуля нет полей" : "Все поля пустые"}
        </p>
      ) : (
        preview.map((field) => {
          const raw = data[field.id];
          const isImage =
            field.type === "image" && typeof raw === "string" && raw.length > 0;
          const text = formatFieldValue(raw);
          // Бывает, что в поле вписали его же название («Сумма» = «Сумма»).
          // Показывать подпись и значение дважды незачем.
          const sameAsLabel =
            text.trim().toLowerCase() === field.label.trim().toLowerCase();

          if (isImage) {
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={field.id}
                src={raw as string}
                alt={field.label}
                className="h-24 w-full rounded-md border border-neutral-200 object-cover dark:border-neutral-800"
              />
            );
          }

          return (
            <div
              key={field.id}
              className="flex items-baseline justify-between gap-3"
            >
              {!sameAsLabel && (
                <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                  {field.label}
                </span>
              )}
              <span
                className={cn(
                  "min-w-0 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100",
                  !sameAsLabel && "text-right"
                )}
                title={text}
              >
                {text}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

export default RecordCard;
