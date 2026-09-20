import { Skeleton } from "@lootlog/ui/components/skeleton";

/** Placeholder for a 32x48 character sprite: a head over a body. */
export const PlayerSilhouetteSkeleton = () => (
  <div aria-hidden="true" className="relative h-12 w-8 rounded-lg bg-muted/20">
    <Skeleton className="absolute left-1/2 top-1 size-3.5 -translate-x-1/2 rounded-full" />
    <Skeleton className="absolute inset-x-1 bottom-1 top-[1.375rem] rounded-t-[0.625rem] rounded-b-md" />
  </div>
);
