import * as React from "react";

import { cn } from "@/lib/utils";

type NoticeKind = "error" | "success";

const NOTICE_COLORS: Record<NoticeKind, string> = {
  error: "text-danger",
  success: "text-success",
};

type NoticeProps = {
  kind?: NoticeKind;
  className?: string;
  children: React.ReactNode;
};

/**
 * Строка состояния под формой: «Заполните поле…», «Сохранено».
 *
 * Раньше в каждом месте была своя пара `<p role="alert" className="text-sm
 * text-danger">`, и роли иногда забывали. Роль теперь определяется видом:
 * ошибка — alert (скринридер прочитает сразу), успех — status.
 */
export function Notice({ kind = "error", className, children }: NoticeProps) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={cn("text-sm", NOTICE_COLORS[kind], className)}
    >
      {children}
    </p>
  );
}

export default Notice;
