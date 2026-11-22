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

export function RecordCard({
  fields,
  data,
  className,
  onEdit,
  onDelete,
}: RecordCardProps) {
  const preview = fields.slice(0, 3);

  return (
    <div
      className={cn(
        "group relative space-y-3 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-[#f97316]/50 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
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
          className="absolute right-2 top-2 rounded-md p-1.5 text-neutral-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] group-hover:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {preview.length === 0 ? (
        <p className="text-sm text-neutral-500">У модуля нет полей</p>
      ) : (
        preview.map((field) => {
          const raw = data[field.id];
          const isImage =
            field.type === "image" && typeof raw === "string" && raw.length > 0;

          return (
            <div key={field.id} className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-neutral-400">
                {field.label}
              </p>

              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={raw as string}
                  alt={field.label}
                  className="h-24 w-full rounded-md border border-neutral-200 object-cover dark:border-neutral-800"
                />
              ) : (
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatFieldValue(raw)}
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default RecordCard;
