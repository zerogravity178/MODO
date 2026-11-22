"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Box, LogOut } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  email: string;
};

export function AppHeader({ email }: AppHeaderProps) {
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
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 pt-safe backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-5 py-3 sm:px-8">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 rounded-md text-sm font-semibold transition",
            isHome
              ? "text-neutral-900 dark:text-neutral-100"
              : "text-neutral-500 hover:text-[#f97316] dark:text-neutral-400"
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f97316] text-white">
            <Box className="h-4 w-4" />
          </span>
          modo
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <span
            className="hidden max-w-[16rem] truncate text-xs text-neutral-500 sm:block dark:text-neutral-400"
            title={email}
          >
            {email}
          </span>

          <ThemeToggle />

          <button
            type="button"
            onClick={handleSignOut}
            disabled={leaving}
            aria-label="Выйти из аккаунта"
            title="Выйти"
            className="rounded-md p-2 text-neutral-500 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
