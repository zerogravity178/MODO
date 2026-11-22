import type {
  FieldDef,
  ModuleRow,
  RecordRow,
} from "@/lib/types";
import { parseFields, parseRecordData } from "@/lib/types";

/** Что попадает в файл — без служебных id пользователя. */
export type ExportRecord = {
  id: string;
  created_at: string | null;
  data: Record<string, unknown>;
};

export type ModuleExport = {
  name: string;
  icon: string | null;
  exported_at: string;
  fields: FieldDef[];
  records: ExportRecord[];
};

export type BackupExport = {
  app: "modo";
  version: 1;
  exported_at: string;
  modules: ModuleExport[];
};

function toExportRecords(records: RecordRow[]): ExportRecord[] {
  return records.map((record) => ({
    id: record.id,
    created_at: record.created_at,
    data: parseRecordData(record.data),
  }));
}

export function buildModuleExport(
  module: ModuleRow,
  records: RecordRow[]
): ModuleExport {
  return {
    name: module.name,
    icon: module.icon,
    exported_at: new Date().toISOString(),
    fields: parseFields(module.fields),
    records: toExportRecords(records),
  };
}

export function buildBackup(
  modules: { module: ModuleRow; records: RecordRow[] }[]
): BackupExport {
  return {
    app: "modo",
    version: 1,
    exported_at: new Date().toISOString(),
    modules: modules.map(({ module, records }) =>
      buildModuleExport(module, records)
    ),
  };
}

/** Значение поля в том виде, в каком его поймёт Excel. */
function csvCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    // Запятая — десятичный разделитель в русской локали Excel.
    return String(value).replace(".", ",");
  }
  if (Array.isArray(value)) return value.join(", ");
  return JSON.stringify(value);
}

/** Экранирование: кавычки удваиваем, ячейку берём в кавычки при спецсимволах. */
function escapeCsvCell(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * CSV для Excel в русской локали: разделитель `;` и BOM,
 * иначе кириллица откроется кракозябрами.
 */
export function toCsv(fields: FieldDef[], records: ExportRecord[]): string {
  const header = [
    ...fields.map((field) => field.label),
    "Создано",
  ].map(escapeCsvCell);

  const rows = records.map((record) =>
    [
      ...fields.map((field) => csvCellValue(record.data[field.id])),
      record.created_at
        ? new Date(record.created_at).toLocaleString("ru-RU")
        : "",
    ].map(escapeCsvCell)
  );

  return `\uFEFF${[header, ...rows].map((row) => row.join(";")).join("\r\n")}`;
}

/** Имя файла без символов, запрещённых в Windows. */
export function safeFileName(name: string, extension: string): string {
  const base = name
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

  return `${base || "modo"}.${extension}`;
}

/** Скачивание на клиенте: Blob → временная ссылка → клик. */
export function downloadFile(
  content: string,
  fileName: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Отзываем ссылку позже: Safari успевает начать скачивание не сразу.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
