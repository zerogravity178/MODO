import {
  Box,
  CheckSquare,
  ClipboardList,
  Search,
  Watch,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Ключи иконок совпадают с тем, что пишут сиды (002_seed_templates.sql). */
const ICONS: Record<string, LucideIcon> = {
  box: Box,
  wallet: Wallet,
  watch: Watch,
  "check-square": CheckSquare,
  "clipboard-list": ClipboardList,
  search: Search,
};

export function getModuleIcon(icon: string | null | undefined): LucideIcon {
  if (!icon) return Box;
  return ICONS[icon] ?? Box;
}
