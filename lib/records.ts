import {
  isBlankValue,
  parseRecordData,
  type FieldDef,
  type RecordRow,
} from "@/lib/types";

export type RecordWithData = {
  record: RecordRow;
  data: Record<string, unknown>;
};

export type SortDirection = "asc" | "desc";

/** Ключ сортировки: id поля или служебное «создано». */
export type SortKey = string | "__created_at__";

/** Приводит значение к строке для поиска. */
export function valueToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (Array.isArray(value)) return value.map(valueToText).join(" ");
  return JSON.stringify(value);
}

export function withData(records: RecordRow[]): RecordWithData[] {
  return records.map((record) => ({
    record,
    data: parseRecordData(record.data),
  }));
}

/** Текст, по которому идёт поиск: все значения записи + дата. */
export function searchHaystack(
  item: RecordWithData,
  fields: FieldDef[]
): string {
  const parts = fields.map((field) => valueToText(item.data[field.id]));
  const created = item.record.created_at ?? "";
  return [...parts, created].join(" ").toLowerCase();
}

export function matchesQuery(
  item: RecordWithData,
  fields: FieldDef[],
  query: string
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  // Несколько слов — все должны найтись (в любом поле).
  return needle
    .split(/\s+/)
    .every((word) => searchHaystack(item, fields).includes(word));
}

/**
 * Значения поля для фильтра: для списка — только его варианты,
 * для остальных типов — реально встречающиеся значения.
 */
export function filterValues(
  items: RecordWithData[],
  field: FieldDef
): string[] {
  if (field.type === "select") return field.options ?? [];
  // У «Да / Нет» вариантов всего два, и они известны заранее.
  if (field.type === "boolean") return ["Да", "Нет"];

  const seen = new Set<string>();

  for (const item of items) {
    const value = item.data[field.id];
    if (isBlankValue(value)) continue;
    seen.add(valueToText(value));
  }

  return Array.from(seen).sort((a, b) => a.localeCompare(b, "ru"));
}

export function matchesFilters(
  item: RecordWithData,
  filters: Record<string, string>
): boolean {
  return Object.entries(filters).every(([fieldId, expected]) => {
    if (!expected) return true;
    const value = item.data[fieldId];
    if (expected === "__empty__") return isBlankValue(value);
    // «Да»/«Нет» приходят из выпадающего списка с заглавной, а в данных
    // лежит boolean — сравниваем без учёта регистра.
    return (
      valueToText(value).toLowerCase() === expected.trim().toLowerCase()
    );
  });
}

/** Числовое сравнение — иначе «10» окажется раньше «9». */
function compareValues(a: unknown, b: unknown): number {
  const aBlank = isBlankValue(a);
  const bBlank = isBlankValue(b);

  // Пустые значения всегда в конце, независимо от направления —
  // это обрабатывается в sortItems через флаг, а здесь только равенство.
  if (aBlank && bBlank) return 0;
  if (aBlank) return 1;
  if (bBlank) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }

  return valueToText(a).localeCompare(valueToText(b), "ru", {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortItems(
  items: RecordWithData[],
  key: SortKey,
  direction: SortDirection
): RecordWithData[] {
  const factor = direction === "desc" ? -1 : 1;

  return [...items].sort((left, right) => {
    if (key === "__created_at__") {
      const a = left.record.created_at ?? "";
      const b = right.record.created_at ?? "";
      return a < b ? -factor : a > b ? factor : 0;
    }

    const a = left.data[key];
    const b = right.data[key];
    const aBlank = isBlankValue(a);
    const bBlank = isBlankValue(b);

    // Пустые — в конец при любом направлении.
    if (aBlank && bBlank) return 0;
    if (aBlank) return 1;
    if (bBlank) return -1;

    return compareValues(a, b) * factor;
  });
}

/** Склонение: 1 запись, 2 записи, 5 записей. */
export function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
