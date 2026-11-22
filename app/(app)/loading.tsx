import { ModuleCardSkeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-neutral-200/80 dark:bg-neutral-800" />
        <div className="h-3 w-56 animate-pulse rounded bg-neutral-200/60 dark:bg-neutral-800/60" />
      </div>

      <div className="space-y-4">
        <div className="h-6 w-36 animate-pulse rounded bg-neutral-200/80 dark:bg-neutral-800" />
        <div className="grid gap-3 sm:grid-cols-2">
          <ModuleCardSkeleton />
          <ModuleCardSkeleton />
          <ModuleCardSkeleton />
          <ModuleCardSkeleton />
        </div>
      </div>
    </div>
  );
}
