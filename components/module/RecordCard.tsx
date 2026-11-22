"use client";

import { ClipboardCopy, Trash2 } from "lucide-react";

import { formatFieldValue, isBlankValue, type FieldDef } from "@/lib/types";
import { cn } from "@/lib/utils";

type RecordCardProps = {
  fields: FieldDef[];
  data: Record<string, unknown>;
  /** fieldId → подписанная ссылка на картинку из Storage. */
  imageUrls?: Record<string, string>;
  className?: string;
  onEdit?: () => void;
  onDelete?: () => void;
};

/** Сколько полей максимум показываем в карточке — остальное в режиме «Таблица». */
const PREVIEW_LIMIT = 4;

/** Длинный текст в карточке обрезаем: простыня ломает сетку. */
const TEXT_PREVIEW_LIMIT = 120;

export function RecordCard({
  fields,
  data,
  imageUrls,
  className,
  onEdit,
  onDelete,
}: RecordCardProps) {
  // Сначала выбрасываем пустые поля, потом ограничиваем количество:
  // иначе карточка с двумя заполненными полями из шести выглядела бы полупустой.
  const preview = fields
    .filter((field) => !isBlankValue(data[field.id]))
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
          className="absolute right-2 top-2 rounded-md p-2 text-neutral-500 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] group-hover:opacity-100 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 [@media(hover:none)]:p-2.5 [@media(hover:none)]:opacity-100"
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
          const signedUrl = imageUrls?.[field.id];
          const isImage = field.type === "image";
          const text = formatFieldValue(raw);
          // Бывает, что в поле вписали его же название («Сумма» = «Сумма»).
          // Показывать подпись и значение дважды незачем.
          const sameAsLabel =
            text.trim().toLowerCase() === field.label.trim().toLowerCase();

          if (isImage) {
            const src =
              signedUrl ??
              (typeof raw === "string" && raw.startsWith("http")
                ? raw
                : undefined);

            return src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={field.id}
                src={src}
                alt={field.label}
                className="h-24 w-full rounded-md border border-neutral-200 object-cover dark:border-neutral-800"
              />
            ) : (
              <div
                key={field.id}
                className="flex items-center gap-1.5 rounded-md border border-dashed border-neutral-200 px-2 py-1.5 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"
              >
                <ClipboardCopy className="h-3.5 w-3.5" />
                {field.label}: файл не загружен
              </div>
            );
          }

          if (field.type === "boolean") {
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
                    "min-w-0 truncate text-sm font-medium",
                    raw === true
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-neutral-500 dark:text-neutral-400",
                    !sameAsLabel && "text-right"
                  )}
                >
                  {raw === true ? "Да" : "Нет"}
                </span>
              </div>
            );
          }

          const truncated =
            field.type === "textarea" && text.length > TEXT_PREVIEW_LIMIT
              ? `${text.slice(0, TEXT_PREVIEW_LIMIT).trimEnd()}…`
              : text;

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
                {truncated}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

export default RecordCard;
