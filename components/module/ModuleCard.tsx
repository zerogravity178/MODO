"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getModuleIcon } from "@/components/module/module-icons";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ModuleCardProps = {
  id?: string;
  name: string;
  icon?: string | null;
  count?: number;
  href?: string;
  className?: string;
  /** Показывать кнопку «Дублировать» — только на главной. */
  canDuplicate?: boolean;
};

export function ModuleCard({
  id,
  name,
  icon,
  count,
  href,
  className,
  canDuplicate = false,
}: ModuleCardProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const Icon = getModuleIcon(icon);
  const canDelete = Boolean(id);

  async function deleteModule() {
    if (!id) return;

    setDeleting(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("modules")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setConfirmOpen(false);
    router.refresh();
  }

  async function duplicateModule() {
    if (!id) return;

    setDuplicating(true);
    setError(null);

    const supabase = createClient();

    const { data: source, error: readError } = await supabase
      .from("modules")
      .select()
      .eq("id", id)
      .single();

    if (readError || !source) {
      setError(readError?.message ?? "Модуль не найден");
      setDuplicating(false);
      return;
    }

    const { error: insertError } = await supabase.from("modules").insert({
      user_id: source.user_id,
      name: `${source.name} (копия)`,
      icon: source.icon,
      fields: source.fields,
      default_view: source.default_view,
    });

    setDuplicating(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.refresh();
  }

  function openConfirm(event: React.MouseEvent<HTMLButtonElement>) {
    // Карточка живёт внутри ссылки — не даём клику увести на модуль.
    event.preventDefault();
    event.stopPropagation();

    setError(null);
    setConfirmOpen(true);
  }

  function handleDuplicate(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    void duplicateModule();
  }

  const card = (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-[#f97316]/60 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
        href && "pr-11",
        className
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f97316]/10 text-[#f97316]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
          {name}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {typeof count === "number"
            ? `${count} ${count === 1 ? "запись" : count < 5 ? "записи" : "записей"}`
            : "Модуль"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="group relative">
      {href ? (
        <Link href={href} className="block">
          {card}
        </Link>
      ) : (
        card
      )}

      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
        {canDuplicate && (
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicating}
            aria-label={`Дублировать модуль «${name}»`}
            title="Дублировать"
            className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <Copy className="h-4 w-4" />
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            onClick={openConfirm}
            aria-label={`Удалить модуль «${name}»`}
            title="Удалить модуль"
            className="rounded-md p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && !confirmOpen && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Удалить модуль?"
        description={`«${name}» и все записи внутри будут удалены безвозвратно.`}
        confirmLabel="Удалить модуль"
        pendingLabel="Удаляем…"
        pending={deleting}
        error={error}
        onConfirm={() => {
          void deleteModule();
        }}
      />
    </div>
  );
}

export default ModuleCard;
