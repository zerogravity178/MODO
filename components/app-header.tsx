"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Box, LogOut } from "lucide-react";

import { BackupButton } from "@/components/backup-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);

  const isHome = pathname === "/";

  async function handleSignOut() {
    setLeaving(true);

    const supabase = createClient();
    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 pt-safe backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-5 py-3 sm:px-8">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 rounded-md text-sm font-semibold transition",
            isHome
              ? "text-foreground"
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Box className="h-4 w-4" />
          </span>
          modo
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <BackupButton />
          <ThemeToggle />

          <button
            type="button"
            onClick={handleSignOut}
            disabled={leaving}
            aria-label="Выйти из аккаунта"
            title="Выйти"
            className="rounded-md p-2 text-muted-foreground transition hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
