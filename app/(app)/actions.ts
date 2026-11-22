"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildBackup } from "@/lib/export";
import { createClient } from "@/lib/supabase/server";
import type { ModuleRow, RecordRow } from "@/lib/types";

export async function createModuleFromTemplate(templateId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select()
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    return;
  }

  const { error: insertError } = await supabase.from("modules").insert({
    user_id: user.id,
    name: template.name,
    icon: template.icon,
    fields: template.fields,
    default_view: template.default_view,
  });

  if (insertError) {
    return;
  }

  revalidatePath("/");
}

/**
 * Резервная копия всех модулей и записей одним JSON-файлом.
 *
 * Собирается по требованию, а не при отрисовке главной: строк может быть
 * много, и держать их в разметке каждого экрана незачем.
 */
export async function exportBackup(): Promise<{
  content?: string;
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Сессия истекла — войдите заново" };
  }

  const [modulesResult, recordsResult] = await Promise.all([
    supabase.from("modules").select().order("created_at", { ascending: false }),
    supabase.from("records").select().order("created_at", { ascending: true }),
  ]);

  if (modulesResult.error || recordsResult.error) {
    return { error: "Не удалось прочитать данные" };
  }

  const records = (recordsResult.data ?? []) as RecordRow[];

  const content = JSON.stringify(
    buildBackup(
      ((modulesResult.data ?? []) as ModuleRow[]).map((module) => ({
        module,
        records: records.filter((record) => record.module_id === module.id),
      }))
    ),
    null,
    2
  );

  return { content };
}
