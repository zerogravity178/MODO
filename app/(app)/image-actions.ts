"use server";

import { revalidatePath } from "next/cache";

import { collectOwnImagePaths, removeOwnImages } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";
import {
  parseFields,
  parseRecordData,
  type ModuleRow,
  type RecordRow,
} from "@/lib/types";

type Result = { error?: string };

/**
 * Пути из списка, которые всё ещё используются записями пользователя.
 *
 * Один файл теоретически может оказаться в нескольких записях: например,
 * кто-то правил `records.data` через API или повторно вставил тот же путь.
 * Удалять такой файл вместе с одной записью нельзя — у остальных картинка
 * пропадёт. Поэтому перед удалением сверяемся с тем, что осталось в базе.
 *
 * `moduleId` не передан — смотрим по всем модулям пользователя: так
 * проверяется удаление целого модуля.
 */
async function pathsStillInUse(
  supabase: ReturnType<typeof createClient>,
  paths: string[],
  userId: string,
  moduleId?: string
): Promise<Set<string>> {
  const used = new Set<string>();
  if (paths.length === 0) return used;

  let request = supabase.from("records").select("data").eq("user_id", userId);
  if (moduleId) request = request.eq("module_id", moduleId);

  const { data } = await request;

  for (const row of data ?? []) {
    const recordData = parseRecordData((row as { data: unknown }).data);
    for (const value of Object.values(recordData)) {
      if (typeof value === "string" && paths.includes(value)) used.add(value);
    }
  }

  return used;
}

/** Убирает файлы, но только те, на которые больше никто не ссылается. */
async function removeUnusedImages(
  supabase: ReturnType<typeof createClient>,
  paths: string[],
  userId: string,
  moduleId?: string
): Promise<void> {
  if (paths.length === 0) return;
  const stillUsed = await pathsStillInUse(supabase, paths, userId, moduleId);
  const removable = paths.filter((path) => !stillUsed.has(path));
  if (removable.length > 0) {
    await removeOwnImages(supabase, removable, userId);
  }
}

/**
 * Удаление записи вместе с её картинками.
 *
 * Порядок важен: сначала удаляем строку, потом файлы. Если файл не удался,
 * запись всё равно уже удалена — «сирота» в хранилище безопаснее, чем
 * запись, которая «не удалилась» из-за проблем с картинкой.
 */
export async function deleteRecordWithImages(recordId: string): Promise<Result> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Сессия истекла — войдите заново" };

  const { data: record, error: readError } = await supabase
    .from("records")
    .select()
    .eq("id", recordId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) return { error: readError.message };
  if (!record) return { error: "Запись не найдена" };

  const recordRow = record as RecordRow;

  const { data: module } = await supabase
    .from("modules")
    .select()
    .eq("id", recordRow.module_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const fields = module ? parseFields((module as ModuleRow).fields) : [];

  const { error: deleteError } = await supabase
    .from("records")
    .delete()
    .eq("id", recordId);

  if (deleteError) return { error: deleteError.message };

  if (fields.length > 0) {
    await removeUnusedImages(
      supabase,
      collectOwnImagePaths([recordRow], fields, user.id),
      user.id,
      recordRow.module_id
    );
  }

  revalidatePath(`/m/${recordRow.module_id}`);
  revalidatePath("/");

  return {};
}

/**
 * Удаление модуля вместе со всеми его картинками.
 *
 * Сначала удаляем строку, потом файлы. Если Storage ответит ошибкой,
 * останутся «сироты» — это неприятно, но куда лучше обратного: когда
 * картинки уже стёрты, а модуль с записями остался.
 */
export async function deleteModuleWithImages(moduleId: string): Promise<Result> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Сессия истекла — войдите заново" };

  // Удаляем только свой модуль. RLS это тоже проверяет, но лучше не
  // полагаться на один барьер: чужой id должен явно отсекаться здесь.
  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select()
    .eq("id", moduleId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (moduleError) return { error: moduleError.message };
  if (!module) return { error: "Модуль не найден" };

  const fields = parseFields((module as ModuleRow).fields);

  const { data: records } = await supabase
    .from("records")
    .select()
    .eq("module_id", moduleId);

  const recordRows = (records ?? []) as RecordRow[];

  const { error: deleteError } = await supabase
    .from("modules")
    .delete()
    .eq("id", moduleId);

  if (deleteError) return { error: deleteError.message };

  // Модуль удалён каскадом вместе с записями — теперь можно убрать и файлы.
  // Проверяем по всем модулям пользователя: тот же путь мог остаться
  // в записи другого модуля (например, после ручной правки через API).
  if (fields.length > 0 && recordRows.length > 0) {
    await removeUnusedImages(
      supabase,
      collectOwnImagePaths(recordRows, fields, user.id),
      user.id
    );
  }

  revalidatePath("/");
  return {};
}
