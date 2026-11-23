"use client";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";

type PreviewToggleProps = {
  open: boolean;
  onToggle: () => void;
};

/**
 * Кнопка «Предпросмотр формы». Одинаковая в создании модуля и в настройках:
 * раньше она была скопирована в оба файла вместе с иконками и подписями.
 */
export function PreviewToggle({ open, onToggle }: PreviewToggleProps) {
  const Icon = open ? EyeOff : Eye;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full sm:w-auto"
    >
      <Icon className="h-4 w-4" />
      {open ? "Скрыть предпросмотр" : "Предпросмотр формы"}
    </Button>
  );
}

export default PreviewToggle;
