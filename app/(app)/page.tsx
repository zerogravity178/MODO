import { redirect } from "next/navigation";

import { HomeContent } from "@/components/home/home-content";
import { createClient } from "@/lib/supabase/server";

// Дата и последние записи считаются заново при каждом заходе.
export const dynamic = "force-dynamic";

/** Сколько последних записей показываем на главной. */
const RECENT_LIMIT = 5;

export default async function HomePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [modulesResult, templatesResult, recentResult] = await Promise.all([
    supabase
      .from("modules")
      .select("*, records(count)")
      .order("created_at", { ascending: false }),
    supabase.from("templates").select().order("sort_order"),
    supabase
      .from("records")
      .select("id, module_id, user_id, data, created_at")
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT),
  ]);

  const modules = modulesResult.data ?? [];
  const templates = templatesResult.data ?? [];
  const recent = recentResult.data ?? [];

  const totalRecords = modules.reduce(
    (sum, module) => sum + (module.records?.[0]?.count ?? 0),
    0
  );

  return (
    <main>
      <HomeContent
        modules={modules}
        templates={templates}
        recent={recent}
        totalRecords={totalRecords}
      />
    </main>
  );
}
