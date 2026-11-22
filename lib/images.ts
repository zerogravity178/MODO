import type { SupabaseClient } from "@supabase/supabase-js";

import { parseRecordData, type FieldDef, type RecordRow } from "@/lib/types";

/** Имя bucket из supabase/migrations/004_storage_images.sql. */
export const IMAGE_BUCKET = "modo-images";

/** Сколько живёт подписанная ссылка. Страница модуля пересобирается при каждом заходе. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Значение картинки, сохранённое как путь внутри bucket.
 * Внешние ссылки (http…) и пустые значения сюда не попадают.
 */
export function isStoragePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("http") &&
    !value.startsWith("data:")
  );
}

/**
 * Собирает подписанные ссылки на картинки записей.
 * Возвращает карту `{ [recordId]: { [fieldId]: signedUrl } }`.
 *
 * Bucket приватный, поэтому без подписи браузер файл не получит.
 * Ошибки не роняют страницу: поле просто останется без картинки.
 */
export async function signRecordImages(
  supabase: SupabaseClient,
  records: RecordRow[],
  fields: FieldDef[]
): Promise<Record<string, Record<string, string>>> {
  const imageFields = fields.filter((field) => field.type === "image");
  if (imageFields.length === 0) return {};

  const paths = new Set<string>();

  for (const record of records) {
    const data = parseRecordData(record.data);
    for (const field of imageFields) {
      const value = data[field.id];
      if (isStoragePath(value)) paths.add(value);
    }
  }

  if (paths.size === 0) return {};

  const unique = Array.from(paths);
  const { data: signed, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);

  if (error || !signed) return {};

  const byPath = new Map<string, string>();
  for (const item of signed) {
    if (item.signedUrl && !item.error && item.path) {
      byPath.set(item.path, item.signedUrl);
    }
  }

  const result: Record<string, Record<string, string>> = {};

  for (const record of records) {
    const data = parseRecordData(record.data);
    for (const field of imageFields) {
      const value = data[field.id];
      if (!isStoragePath(value)) continue;
      const url = byPath.get(value);
      if (!url) continue;

      result[record.id] ??= {};
      result[record.id][field.id] = url;
    }
  }

  return result;
}
