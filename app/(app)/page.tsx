import { redirect } from "next/navigation";

import { ModuleCard, getModuleIcon } from "@/components/module/ModuleCard";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { createModuleFromTemplate } from "./actions";

// Дата должна считаться заново при каждом заходе, а не на этапе сборки.
export const dynamic = "force-dynamic";

const TIME_ZONE = "Europe/Moscow";

function formatToday(now: Date) {
  const date = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: TIME_ZONE,
  }).format(now);
  const weekday = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    timeZone: TIME_ZONE,
  }).format(now);

  return `${date}, ${weekday}`;
}

export default async function HomePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [modulesResult, templatesResult] = await Promise.all([
    supabase.from("modules").select().order("created_at", { ascending: false }),
    supabase.from("templates").select().order("sort_order"),
  ]);

  const modules = modulesResult.data ?? [];
  const templates = templatesResult.data ?? [];
  const hasModules = modules.length > 0;

  return (
    <main className="space-y-10">
      <header className="space-y-1">
        <p className="text-sm font-medium text-[#f97316]">
          {formatToday(new Date())}
        </p>
        <p className="text-xs text-neutral-500">Твои инструменты, твои правила</p>
      </header>

      {hasModules ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900">Мои модули</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((module) => (
              <ModuleCard key={module.id} name={module.name} icon={module.icon} />
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-neutral-900">С чего начать</h2>
            <p className="text-sm text-neutral-500">
              Выберите готовый шаблон — модуль создастся сразу.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {templates.map((template) => {
              const Icon = getModuleIcon(template.icon);

              return (
                <div
                  key={template.id}
                  className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f97316]/10 text-[#f97316]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="truncate font-medium text-neutral-900">
                      {template.name}
                    </p>
                  </div>

                  <form action={createModuleFromTemplate.bind(null, template.id)}>
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full bg-[#f97316] text-white hover:bg-[#ea6a0b]"
                    >
                      Использовать
                    </Button>
                  </form>
                </div>
              );
            })}
          </div>

          {templates.length === 0 && (
            <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">
              Шаблоны не загружены. Выполните `002_seed_templates.sql` в Supabase
              SQL Editor.
            </p>
          )}

          <Button
            variant="outline"
            disabled
            className="w-full border-dashed border-neutral-300 text-neutral-500"
          >
            Собрать свой модуль
          </Button>
          <p className="text-xs text-neutral-400">
            Конструктор своего модуля появится на следующем шаге.
          </p>
        </section>
      )}
    </main>
  );
}
