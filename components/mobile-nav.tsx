"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavActive, NAV_ITEMS } from "@/components/app-nav";
import { cn } from "@/lib/utils";

/**
 * Нижняя панель для телефона: три пункта, крупные тач-цели,
 * отступ под системный жест снизу.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-safe backdrop-blur sm:hidden"
    >
      <ul className="mx-auto flex w-full max-w-md items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item.href, pathname);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium transition",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.shortLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default MobileNav;
