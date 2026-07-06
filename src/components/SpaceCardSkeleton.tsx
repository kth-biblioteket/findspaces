import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder that mirrors the SpaceCard layout so the page
 * doesn't shift when real data arrives. Purely decorative — hidden
 * from assistive tech via aria-hidden on the container.
 */
export function SpaceCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-card rounded-2xl shadow-[0_4px_16px_-2px_rgba(15,23,42,0.12),0_2px_6px_-2px_rgba(15,23,42,0.08)] overflow-hidden"
    >
      <div className="flex flex-col md:grid md:grid-cols-[2fr_3fr] items-stretch gap-0">
        <div className="order-2 md:order-1 min-w-0 flex flex-col gap-4 md:gap-5 p-3 md:p-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-7 w-28 rounded-md" />
          </div>
          <div className="mt-auto flex flex-wrap justify-end gap-2 pt-4">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
        </div>
        <div className="order-1 md:order-2 w-full shrink-0 self-stretch aspect-[3/2] md:aspect-auto md:h-full md:min-h-[22rem]">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
      </div>
    </div>
  );
}
