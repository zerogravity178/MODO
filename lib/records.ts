import {
  formatFieldValue,
  parseRecordData,
  type FieldDef,
  type RecordRow,
} from "@/lib/types";

export type SortDirection = "asc" | "desc";
export type SortKey = string | "__created_at__";

export type RecordWithData = {
  record: RecordRow;
  data: Record<string, unknown>;
};

export function withData(records: RecordRow[]): RecordWithData[] {
  return records.map((record) => ({
    record,
    data: parseRecordData(record.data),
  }));
}

/** Поиск по всем значениям записи без учёта регистра. */
export function matchesQuery(
  item: RecordWithData,
  fields: FieldDef[],
  query: string
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return fields.some((field) =>
    formatFieldValue(item.data[field.id]).toLowerCase().includes(needle)
  );
}

function compareValues(a: unknown, b: unknown): number {
  const emptyA = a === null || a === undefined || a === "";
  const emptyB = b === null || b === undefined || b === "";
  // Пустые значения всегда в конце, независимо от направления.
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  if (typeof a === "number" && typeof b === "number") return a - b;

  return String(a).localeCompare(String(b), "ru", { numeric: true });
}

export function sortItems(
  items: RecordWithData[],
  key: SortKey,
  direction: SortDirection
): RecordWithData[] {
  const sign = direction === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    if (key === "__created_at__") {
      const a = left.record.created_at ?? "";
      const b = right.record.created_at ?? "";
      return a.localeCompare(b) * sign;
    }

    const compared = compareValues(left.data[key], right.data[key]);
    // compareValues уже отправляет пустые в конец — не переворачиваем их.
    const isEmpty =
      left.data[key] === null ||
      left.data[key] === undefined ||
      left.data[key] === "" ||
      right.data[key] === null ||
      right.data[key] === undefined ||
      right.data[key] === "";

    return isEmpty ? compared : compared * sign;
  });
}

export type NumericSummary = {
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
};

export function summarizeNumeric(
  items: RecordWithData[],
  fieldId: string
): NumericSummary | null {
  const numbers = items
    .map((item) => item.data[fieldId])
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

  if (numbers.length === 0) return null;

  const sum = numbers.reduce((total, value) => total + value, 0);

  return {
    count: numbers.length,
    sum,
    average: sum / numbers.length,
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  };
}

export type Group = {
  value: string;
  items: RecordWithData[];
};

/** Группировка по значению поля; записи без значения уходят в «Без значения». */
export function groupByField(
  items: RecordWithData[],
  field: FieldDef
): Group[] {
  const groups = new Map<string, RecordWithData[]>();

  for (const item of items) {
    const raw = formatFieldValue(item.data[field.id]);
    const value = raw === "—" ? "Без значения" : raw;
    const bucket = groups.get(value);

    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(value, [item]);
    }
  }

  const ordered = Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === "Без значения") return 1;
    if (b === "Без значения") return -1;
    return a.localeCompare(b, "ru");
  });

  return ordered.map(([value, groupItems]) => ({ value, items: groupItems }));
}

/** Число с разделителем тысяч — для сводки над таблицей. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(value);
}

function escapeCsvCell(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * CSV с точкой с запятой: Excel в русской локали ждёт именно её,
 * иначе все колонки слипаются в одну.
 */
export function toCsv(fields: FieldDef[], records: RecordRow[]): string {
  const header = [...fields.map((field) => field.label), "Создано"];
  const lines = records.map((record) => {
    const data = parseRecordData(record.data);

    const cells = fields.map((field) => {
      const value = formatFieldValue(data[field.id]);
      return escapeCsvCell(value === "—" ? "" : value);
    });

    const created = record.created_at
      ? new Date(record.created_at).toLocaleString("ru-RU")
      : "";

    return [...cells, escapeCsvCell(created)].join(";");
  });

  return [header.map(escapeCsvCell).join(";"), ...lines].join("\r\n");
}
