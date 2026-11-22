"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { exportBackup } from "@/app/(app)/actions";
import { downloadFile, safeFileName } from "@/lib/export";
import { cn } from "@/lib/utils";

/**
 * Маленькая кнопка в шапке: собирает резервную копию по клику.
 *
 * Файл готовится на сервере, а не при отрисовке страницы — иначе все записи
 * пришлось бы читать на каждом экране, включая просмотр модуля.
 */
export function BackupButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    try {
      const result = await exportBackup();

      if (!result.content) {
        setError(result.error ?? "Не удалось собрать копию");
        return;
      }

      const stamp = new Date().toISOString().slice(0, 10);
      downloadFile(
        result.content,
        safeFileName(`modo-backup-${stamp}`, "json"),
        "application/json"
      );
    } catch {
      setError("Не удалось собрать копию");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label="Скачать резервную копию"
      title={error ?? "Скачать резервную копию"}
      className={cn(
        "rounded-md p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        error
          ? "text-danger hover:bg-danger/10"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span role="status" className="sr-only">
        {error ?? ""}
      </span>
    </button>
  );
}

export default BackupButton;
