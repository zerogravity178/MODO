import { getModuleIcon } from "@/components/module/module-icons";

type EmptyStateProps = {
  icon?: string | null;
  title: string;
  description?: string;
  children?: React.ReactNode;
};

/** Заглушка для пустых списков — с иконкой вместо серой строки текста. */
export function EmptyState({
  icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  const Icon = getModuleIcon(icon ?? "box");

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface/60 px-6 py-10 text-center dark:bg-card/40">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          {title}
        </p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export default EmptyState;
