"use client";

import { ClipboardCopy, Trash2 } from "lucide-react";

import { Surface } from "@/components/ui/surface";
import { formatFieldValue, isBlankValue, type FieldDef } from "@/lib/types";
import { cn } from "@/lib/utils";

type RecordCardProps = {
  fields: FieldDef[];
  data: Record<string, unknown>;
  /** fieldId → подписанная ссылка на картинку из Storage. */
  imageUrls?: Record<string, string>;
  /** Дата создания — показывается подписью в подвале карточки. */
  createdAt?: string;
  className?: string;
  onEdit?: () => void;
  onDelete?: () => void;
};

/** Сколько строк показываем в карточке: заголовок + 3 строки. */
const PREVIEW_LIMIT = 3;

/** Длинный текст в карточке обрезаем: простыня ломает сетку. */
const TEXT_PREVIEW_LIMIT = 120;

/** Заголовком карточки не может быть картинка или галочка — они не читаются. */
const TITLE_TYPES: FieldDef["type"][] = ["text", "textarea", "number", "date", "select"];

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function RecordCard({
  fields,
  data,
  imageUrls,
  createdAt,
  className,
  onEdit,
  onDelete,
}: RecordCardProps) {
  const filled = fields.filter((field) => !isBlankValue(data[field.id]));

  // Заголовок — первое осмысленное значение. Раньше карточка начиналась
  // с подписи поля, и при десятке записей их приходилось читать целиком.
  const titleField =
    filled.find((field) => TITLE_TYPES.includes(field.type)) ?? filled[0];

  // Остальные поля — компактными строками, картинки отдельно.
  const rest = filled
    .filter((field) => field.id !== titleField?.id)
    .slice(0, PREVIEW_LIMIT);
  const images = filled.filter((field) => field.type === "image").slice(0, 1);

  const titleText = titleField ? formatFieldValue(data[titleField.id]) : "";

  return (
    <Surface
      interactive
      className={cn(
        "group relative flex h-full min-w-0 flex-col gap-2.5",
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
          className="absolute right-2 top-2 rounded-md p-2 text-muted-foreground opacity-0 transition hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 [@media(hover:none)]:p-2.5 [@media(hover:none)]:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {filled.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {fields.length === 0 ? "У модуля нет полей" : "Все поля пустые"}
        </p>
      ) : (
        <>
          <div className="min-w-0 space-y-0.5">
            {titleField && titleField.type === "boolean" ? (
              <p
                className={cn(
                  "truncate pr-6 text-base font-semibold",
                  data[titleField.id] === true
                    ? "text-success"
                    : "text-muted-foreground"
                )}
              >
                {data[titleField.id] === true ? "Да" : "Нет"}
              </p>
            ) : (
              <p
                className={cn(
                  "truncate pr-6 text-base font-semibold text-foreground",
                  titleField && titleText.length > TEXT_PREVIEW_LIMIT && "pr-0"
                )}
                title={titleText}
              >
                {titleText.length > TEXT_PREVIEW_LIMIT
                  ? `${titleText.slice(0, TEXT_PREVIEW_LIMIT).trimEnd()}…`
                  : titleText}
              </p>
            )}
            {titleField && titleField.type !== "boolean" && (
              <p className="truncate text-xs text-muted-foreground">
                {titleField.label}
              </p>
            )}
          </div>

          {rest.length > 0 && (
            <div className="divide-y divide-border border-t border-border">
              {rest.map((field) => {
                const raw = data[field.id];
                const isBoolean = field.type === "boolean";
                const text = formatFieldValue(raw);
                // Бывает, что в поле вписали его же название («Сумма» = «Сумма»).
                const sameAsLabel =
                  text.trim().toLowerCase() === field.label.trim().toLowerCase();
                const value =
                  field.type === "textarea" && text.length > TEXT_PREVIEW_LIMIT
                    ? `${text.slice(0, TEXT_PREVIEW_LIMIT).trimEnd()}…`
                    : text;

                return (
                  <div
                    key={field.id}
                    className="flex items-baseline justify-between gap-3 py-1.5"
                  >
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {field.label}
                    </span>
                    {isBoolean ? (
                      <span
                        className={cn(
                          "min-w-0 truncate text-right text-sm font-medium",
                          raw === true ? "text-success" : "text-muted-foreground"
                        )}
                      >
                        {raw === true ? "Да" : "Нет"}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "min-w-0 truncate text-right text-sm font-medium text-foreground",
                          sameAsLabel && "text-muted-foreground"
                        )}
                        title={text}
                      >
                        {value}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {images.map((field) => {
            const raw = data[field.id];
            const src =
              imageUrls?.[field.id] ??
              (typeof raw === "string" && raw.startsWith("http")
                ? raw
                : undefined);

            return src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={field.id}
                src={src}
                alt={field.label}
                className="h-24 w-full rounded-md border border-border object-cover"
              />
            ) : (
              <div
                key={field.id}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <ClipboardCopy className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{field.label}: файл не загружен</span>
              </div>
            );
          })}

          {createdAt && (
            <p className="mt-auto border-t border-border pt-2 text-xs text-muted-foreground">
              {formatDay(createdAt)}
            </p>
          )}
        </>
      )}
    </Surface>
  );
}

export default RecordCard;
