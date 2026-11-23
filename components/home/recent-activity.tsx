import Link from "next/link";

import { getModuleIcon } from "@/components/module/module-icons";
import { IconBadge } from "@/components/ui/icon-badge";
import { parseFields, parseRecordData, isBlankValue } from "@/lib/types";
import type { ModuleRow, RecordRow } from "@/lib/types";

const TIME_ZONE = "Europe/Moscow";

type RecentActivityProps = {
  modules: ModuleRow[];
  records: RecordRow[];
};

/** Ключ дня в московском времени — чтобы «сегодня» не съезжало на UTC. */
function dayKey(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatWhen(iso: string | null) {
  if (!iso) return "";

  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "";

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const time = new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

  if (dayKey(value) === dayKey(now)) return `сегодня, ${time}`;
  if (dayKey(value) === dayKey(yesterday)) return `вчера, ${time}`;

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(value);
}

/** Первое непустое значение записи — по порядку полей модуля. */
function titleOf(data: Record<string, unknown>, fieldIds: string[]) {
  for (const id of fieldIds) {
    const value = data[id];
    if (isBlankValue(value)) continue;
    if (typeof value === "object") continue;

    return String(value);
  }

  return null;
}

export function RecentActivity({ modules, records }: RecentActivityProps) {
  if (records.length === 0) return null;

  const byId = new Map(modules.map((row) => [row.id, row]));

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Последние записи</h2>

      <ul className="space-y-2">
        {records.map((record) => {
          const parent = byId.get(record.module_id);
          if (!parent) return null;

          const fields = parseFields(parent.fields);
          const data = parseRecordData(record.data);
          const title = titleOf(
            data,
            fields.map((field) => field.id)
          );
          const Icon = getModuleIcon(parent.icon);

          return (
            <li key={record.id}>
              <Link
                href={`/m/${parent.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition hover:border-primary/60"
              >
                <IconBadge icon={Icon} size="sm" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {title ?? "Без названия"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {parent.name}
                  </p>
                </div>

                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatWhen(record.created_at)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default RecentActivity;
