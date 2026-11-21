"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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
