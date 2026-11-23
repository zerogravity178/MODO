"use client";

import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { IconBadge } from "@/components/ui/icon-badge";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <IconBadge icon={TriangleAlert} size="empty" />

        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">
            Что-то пошло не так
          </h1>
          <p className="text-sm text-muted-foreground">
            Не удалось показать эту страницу. Попробуйте ещё раз — данные не
            пострадали.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground">
              {error.digest}
            </p>
          )}
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button onClick={reset} className="w-full">
            <RotateCcw className="mr-1 h-4 w-4" />
            Попробовать снова
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">На главную</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
