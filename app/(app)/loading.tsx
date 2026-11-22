import { ModuleCardSkeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-56 animate-pulse rounded bg-secondary/60" />
      </div>

      <div className="space-y-4">
        <div className="h-6 w-36 animate-pulse rounded bg-secondary" />
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
