"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

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
};

export function ModuleCard({
  id,
  name,
  icon,
  count,
  href,
  className,
}: ModuleCardProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  function openConfirm(event: React.MouseEvent<HTMLButtonElement>) {
    // Карточка живёт внутри ссылки — не даём клику увести на модуль.
    event.preventDefault();
    event.stopPropagation();

    setError(null);
    setConfirmOpen(true);
  }

  const card = (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-[#f97316]/60 hover:shadow-sm",
        href && "pr-11",
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

  return (
    <div className="group relative">
      {href ? (
        <Link href={href} className="block">
          {card}
        </Link>
      ) : (
        card
      )}

      {canDelete && (
        <button
          type="button"
          onClick={openConfirm}
          aria-label={`Удалить модуль «${name}»`}
          title="Удалить модуль"
          className="absolute right-2 top-2 rounded-md p-1.5 text-neutral-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
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
