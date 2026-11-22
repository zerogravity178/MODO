export type FieldType = "text" | "number" | "date" | "select" | "image";

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

/** Показывает значение поля в читаемом виде. */
export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
