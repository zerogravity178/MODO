"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { downloadFile, safeFileName } from "@/lib/export";

type ExportAllButtonProps = {
  /** Готовый JSON — собран на сервере, чтобы не тянуть все записи в браузер дважды. */
  content: string;
};

export function ExportAllButton({ content }: ExportAllButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        const stamp = new Date().toISOString().slice(0, 10);
        downloadFile(
          content,
          safeFileName(`modo-backup-${stamp}`, "json"),
          "application/json"
        );
      }}
    >
      <Download className="mr-1 h-4 w-4" />
      Резервная копия
    </Button>
  );
}

export default ExportAllButton;
