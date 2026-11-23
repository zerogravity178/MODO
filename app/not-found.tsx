import Link from "next/link";
import { Compass } from "lucide-react";

import { IconBadge } from "@/components/ui/icon-badge";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
        <IconBadge icon={Compass} size="empty" />

        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">
            Страница не найдена
          </h1>
          <p className="text-sm text-muted-foreground">
            Такой страницы нет или она была удалена.
          </p>
        </div>

        <Button asChild className="w-full">
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </div>
  );
}
