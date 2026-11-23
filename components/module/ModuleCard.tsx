"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconBadge } from "@/components/ui/icon-badge";
import { Surface } from "@/components/ui/surface";
import { plural } from "@/lib/records";
import { getModuleIcon } from "@/components/module/module-icons";
import { deleteModuleWithImages } from "@/app/(app)/image-actions";
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

    // Модуль удаляется каскадом с записями, файлы — на сервере.
    const result = await deleteModuleWithImages(id);

    if (result.error) {
      setError(result.error);
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
    <Surface
      interactive
      className={cn("group flex items-center gap-4", href && "pr-11", className)}
    >
      <IconBadge icon={Icon} size="md" />
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">
          {typeof count === "number"
            ? `${count} ${plural(count, "запись", "записи", "записей")}`
            : "Модуль"}
        </p>
      </div>
    </Surface>
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

      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        {canDuplicate && (
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={duplicating}
            aria-label={`Дублировать модуль «${name}»`}
            title="Дублировать"
            className="rounded-md p-2 text-muted-foreground [@media(hover:none)]:p-2.5 transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
            className="rounded-md p-2 text-muted-foreground [@media(hover:none)]:p-2.5 transition hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && !confirmOpen && (
        <p role="alert" className="mt-1 text-xs text-danger">
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
