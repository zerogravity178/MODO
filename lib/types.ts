export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "boolean"
  | "image";

export type FieldDef = {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
};

export type ModuleRow = {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  fields: unknown;
  default_view: string | null;
  created_at: string | null;
};

export type RecordRow = {
  id: string;
  module_id: string;
  user_id: string;
  data: unknown;
  created_at: string | null;
};

/** Все типы в одном месте — порядок совпадает с порядком в конструкторе. */
export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "textarea", label: "Длинный текст" },
  { value: "number", label: "Число" },
  { value: "date", label: "Дата" },
  { value: "select", label: "Список" },
  { value: "boolean", label: "Да / Нет" },
  { value: "image", label: "Картинка" },
];

/** jsonb из Supabase приходит как unknown — приводим его к FieldDef[]. */
export function parseFields(value: unknown): FieldDef[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is FieldDef => {
    if (!item || typeof item !== "object") return false;
    const field = item as Partial<FieldDef>;
    return typeof field.id === "string" && typeof field.label === "string";
  });
}

/** jsonb из Supabase приходит как unknown — приводим его к объекту значений. */
export function parseRecordData(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/**
 * Пустое значение: null, undefined, строка из пробелов, пустой массив.
 * Ноль и false пустыми НЕ считаются — это осмысленные значения.
 */
export function isBlankValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Показывает значение поля в читаемом виде. */
export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
