import { redirect } from "next/navigation";
import { Palette, User } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { IconBadge } from "@/components/ui/icon-badge";
import { Surface } from "@/components/ui/surface";
import { createClient } from "@/lib/supabase/server";
import { plural } from "@/lib/records";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [modulesResult, recordsResult] = await Promise.all([
    supabase.from("modules").select("id", { count: "exact", head: true }),
    supabase.from("records").select("id", { count: "exact", head: true }),
  ]);

  const moduleCount = modulesResult.count ?? 0;
  const recordCount = recordsResult.count ?? 0;

  return (
    <main className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Настройки</h1>
        <p className="text-sm text-muted-foreground">
          Аккаунт, оформление и данные.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Аккаунт</h2>

        <Surface padding="md" className="space-y-4">
          <div className="flex items-center gap-3">
            <IconBadge icon={User} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {user.email ?? "Без почты"}
              </p>
              <p className="text-xs text-muted-foreground">
                {moduleCount} {plural(moduleCount, "модуль", "модуля", "модулей")}
                {" · "}
                {recordCount} {plural(recordCount, "запись", "записи", "записей")}
              </p>
            </div>
          </div>

          <SignOutButton variant="full" />
        </Surface>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Оформление</h2>

        <Surface padding="md" className="space-y-4">
          <div className="flex items-center gap-3">
            <IconBadge icon={Palette} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Тема</p>
              <p className="text-xs text-muted-foreground">
                Выбор запоминается на этом устройстве.
              </p>
            </div>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </Surface>
      </section>
    </main>
  );
}
