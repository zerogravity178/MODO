import { getModuleIcon } from "@/components/module/module-icons";
import { IconBadge } from "@/components/ui/icon-badge";
import { Surface } from "@/components/ui/surface";

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
    <Surface
      variant="dashed"
      padding="none"
      className="flex flex-col items-center gap-3 px-6 py-10 text-center"
    >
      <IconBadge icon={Icon} size="empty" />
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children}
    </Surface>
  );
}

export default EmptyState;
