import { notFound, redirect } from "next/navigation";

import { ModuleView } from "@/components/module/ModuleView";
import { signRecordImages } from "@/lib/images";
import { createClient } from "@/lib/supabase/server";
import { parseFields, type ModuleRow, type RecordRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ModulePage({
  params,
}: {
  params: { moduleId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: module } = await supabase
    .from("modules")
    .select()
    .eq("id", params.moduleId)
    .maybeSingle();

  // RLS не отдаст чужой модуль — для нас это равносильно «не найдено».
  if (!module) {
    notFound();
  }

  const { data: records } = await supabase
    .from("records")
    .select()
    .eq("module_id", params.moduleId)
    .order("created_at", { ascending: false });

  const moduleRow = module as ModuleRow;
  const recordRows = (records ?? []) as RecordRow[];
  const fields = parseFields(moduleRow.fields);

  // Bucket приватный: без подписанных ссылок браузер картинки не покажет.
  const imageUrls = await signRecordImages(supabase, recordRows, fields);

  return (
    <ModuleView
      module={moduleRow}
      fields={fields}
      records={recordRows}
      imageUrls={imageUrls}
    />
  );
}
