import type { LucideIcon } from "lucide-react";
import { LayoutGrid, Plus, Settings } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Короткая подпись для нижней панели на телефоне. */
  shortLabel: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Главная", shortLabel: "Модули", icon: LayoutGrid },
  { href: "/m/new", label: "Новый модуль", shortLabel: "Создать", icon: Plus },
  { href: "/settings", label: "Настройки", shortLabel: "Настройки", icon: Settings },
];

/** Главная активна только на точном совпадении, остальные — на вложенных путях тоже. */
export function isNavActive(href: string, pathname: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
