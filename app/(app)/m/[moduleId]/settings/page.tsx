import { notFound, redirect } from "next/navigation";

import { ModuleSettings } from "@/components/module/ModuleSettings";
import { createClient } from "@/lib/supabase/server";
import type { ModuleRow } from "@/lib/types";

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

  return <ModuleSettings module={module as ModuleRow} />;
}
