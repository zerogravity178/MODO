import { notFound, redirect } from "next/navigation";

import { ModuleSettings } from "@/components/module/ModuleSettings";
import { createClient } from "@/lib/supabase/server";
import {
  parseFields,
  parseRecordData,
  type ModuleRow,
  type RecordRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ModuleSettingsPage({
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

  // Для предупреждения «картинки не попадут в экспорт» достаточно факта:
  // есть ли хоть одно заполненное поле-картинка.
  const imageFields = fields.filter((field) => field.type === "image");
  const imageCount = recordRows.reduce((total, record) => {
    const data = parseRecordData(record.data);
    return (
      total +
      imageFields.filter((field) => {
        const value = data[field.id];
        return typeof value === "string" && value.length > 0;
      }).length
    );
  }, 0);

  return (
    <ModuleSettings
      module={moduleRow}
      records={recordRows}
      imageCount={imageCount}
    />
  );
}
