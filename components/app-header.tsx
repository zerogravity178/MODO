"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Box } from "lucide-react";

import { isNavActive, NAV_ITEMS } from "@/components/app-nav";
import { BackupButton } from "@/components/backup-button";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 pt-safe backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-5 py-3 sm:px-8">
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

        {/* На телефоне навигация живёт в нижней панели. */}
        <nav
          aria-label="Разделы"
          className="ml-4 hidden items-center gap-1 sm:flex"
        >
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(item.href, pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-9 items-center rounded-md px-2.5 text-sm font-medium transition",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <BackupButton />
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
