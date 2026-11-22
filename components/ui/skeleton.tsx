import { cn } from "@/lib/utils";

/** Плейсхолдер на время загрузки — повторяет силуэт карточки модуля. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-secondary",
        className
      )}
    />
  );
}

export function ModuleCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-11 w-11 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

export function RecordCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export default Skeleton;
