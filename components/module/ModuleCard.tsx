import Link from "next/link";
import {
  Box,
  CheckSquare,
  ClipboardList,
  Watch,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  box: Box,
  wallet: Wallet,
  watch: Watch,
  "check-square": CheckSquare,
  "clipboard-list": ClipboardList,
};

export function getModuleIcon(icon: string | null | undefined): LucideIcon {
  if (!icon) return Box;
  return ICONS[icon] ?? Box;
}

type ModuleCardProps = {
  name: string;
  icon?: string | null;
  count?: number;
  href?: string;
  className?: string;
};

export function ModuleCard({
  name,
  icon,
  count,
  href,
  className,
}: ModuleCardProps) {
  const Icon = getModuleIcon(icon);

  const card = (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-[#f97316]/60 hover:shadow-sm",
        className
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f97316]/10 text-[#f97316]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-neutral-900">{name}</p>
        <p className="text-xs text-neutral-500">
          {typeof count === "number"
            ? `${count} ${count === 1 ? "запись" : "записей"}`
            : "Модуль"}
        </p>
      </div>
    </div>
  );

  if (!href) return card;

  return (
    <Link href={href} className="block">
      {card}
    </Link>
  );
}

export default ModuleCard;
