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
 * Путь лежит в личной папке пользователя?
 *
 * Структура `{user_id}/{module_id}/{файл}` задана в 004_storage_images.sql,
 * и Storage разрешает работу только с первым сегментом, равным uid. Проверка
 * на клиенте и сервере — вторая линия: даже если в `records.data` окажется
 * чужой путь (старые данные, ручная правка через API), мы не будем ни
 * подписывать его, ни удалять.
 */
export function isOwnStoragePath(path: unknown, userId: string): path is string {
  if (!isStoragePath(path) || !userId) return false;
  // «..» в сегменте — попытка выйти из своей папки.
  if (path.split("/").some((segment) => segment === ".." || segment === ".")) {
    return false;
  }
  return path.startsWith(`${userId}/`);
}

/** Все строковые значения записи, похожие на путь в нашем bucket. */
function pathsInData(
  data: Record<string, unknown>,
  fields: FieldDef[]
): string[] {
  const result: string[] = [];

  for (const field of fields) {
    if (field.type !== "image") continue;
    const value = data[field.id];
    if (isStoragePath(value)) result.push(value);
  }

  return result;
}

/**
 * Пути картинок записей, лежащие в папке пользователя.
 * Чужие значения отбрасываются — по ним нельзя ни подписать, ни удалить файл.
 */
export function collectOwnImagePaths(
  records: RecordRow[],
  fields: FieldDef[],
  userId: string
): string[] {
  const paths = new Set<string>();

  for (const record of records) {
    for (const path of pathsInData(parseRecordData(record.data), fields)) {
      if (isOwnStoragePath(path, userId)) paths.add(path);
    }
  }

  return Array.from(paths);
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
  fields: FieldDef[],
  userId: string
): Promise<Record<string, Record<string, string>>> {
  const imageFields = fields.filter((field) => field.type === "image");
  if (imageFields.length === 0) return {};

  const paths = new Set<string>();

  for (const record of records) {
    const data = parseRecordData(record.data);
    for (const field of imageFields) {
      const value = data[field.id];
      // Подписываем только свои файлы. Storage отказал бы и сам, но тогда
      // ошибка пришла бы на весь пакет ссылок, а не на одну запись.
      if (isOwnStoragePath(value, userId)) paths.add(value);
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
      if (!isOwnStoragePath(value, userId)) continue;
      const url = byPath.get(value);
      if (!url) continue;

      result[record.id] ??= {};
      result[record.id][field.id] = url;
    }
  }

  return result;
}

/**
 * Удаляет файлы из Storage, но только те, что лежат в папке пользователя.
 * Возвращает список путей, которые удалить не удалось.
 */
export async function removeOwnImages(
  supabase: SupabaseClient,
  paths: string[],
  userId: string
): Promise<string[]> {
  const safe = Array.from(new Set(paths.filter((p) => isOwnStoragePath(p, userId))));
  if (safe.length === 0) return [];

  const failed: string[] = [];

  // Storage принимает пачками; по 100 — заведомо безопасный размер.
  for (let index = 0; index < safe.length; index += 100) {
    const chunk = safe.slice(index, index + 100);
    const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(chunk);
    if (error) failed.push(...chunk);
  }

  return failed;
}
