"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getModuleIcon } from "@/components/module/module-icons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { ModuleRow } from "@/lib/types";

type ModuleSettingsProps = {
  module: ModuleRow;
};

export function ModuleSettings({ module }: ModuleSettingsProps) {
  const router = useRouter();
  const Icon = getModuleIcon(module.icon);

  const [name, setName] = useState(module.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const trimmed = name.trim();

    if (!trimmed) {
      setError("Название не может быть пустым");
      return;
    }

    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("modules")
      .update({ name: trimmed })
      .eq("id", module.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("modules")
      .delete()
      .eq("id", module.id);

    if (deleteError) {
      setDeleteError(deleteError.message);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setConfirmOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <Link
          href={`/m/${module.id}`}
          className="inline-flex items-center gap-1 text-sm text-neutral-500 transition hover:text-[#f97316]"
        >
          ← Назад к модулю
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f97316]/10 text-[#f97316]">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-neutral-900">
              Настройки
            </h1>
            <p className="truncate text-sm text-neutral-500">{module.name}</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSave} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="module-name">Название модуля</Label>
          <Input
            id="module-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSaved(false);
            }}
            className="focus-visible:ring-[#f97316]"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        {saved && (
          <p role="status" className="text-sm text-green-700">
            Сохранено
          </p>
        )}

        <Button
          type="submit"
          disabled={saving || name.trim() === module.name}
          className="bg-[#f97316] text-white hover:bg-[#ea6a0b]"
        >
          {saving ? "Сохраняем…" : "Сохранить"}
        </Button>
      </form>

      <section className="space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-4">
        <div className="space-y-1">
          <h2 className="font-semibold text-neutral-900">Удаление модуля</h2>
          <p className="text-sm text-neutral-600">
            Модуль и все записи внутри будут удалены безвозвратно.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDeleteError(null);
            setConfirmOpen(true);
          }}
          className="border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
        >
          Удалить модуль
        </Button>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmOpen(false);
            setDeleteError(null);
          }
        }}
        title="Удалить модуль?"
        description={`«${module.name}» и все записи внутри будут удалены безвозвратно.`}
        confirmLabel="Удалить модуль"
        pending={deleting}
        error={deleteError}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </div>
  );
}

export default ModuleSettings;
