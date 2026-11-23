import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/** Плейсхолдер на время загрузки — повторяет силуэт карточки модуля. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-secondary", className)}
    />
  );
}

export function ModuleCardSkeleton() {
  return (
    <Surface padding="md" className="flex items-center gap-4">
      <Skeleton className="h-11 w-11 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </Surface>
  );
}

export function RecordCardSkeleton() {
  return (
    <Surface padding="md" className="space-y-3">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/4" />
      <Skeleton className="h-4 w-1/2" />
    </Surface>
  );
}

export default Skeleton;
