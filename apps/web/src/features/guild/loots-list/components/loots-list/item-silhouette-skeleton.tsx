import { Skeleton } from "@lootlog/ui/components/skeleton";

/** Placeholder matching the framed 32px item image, border included. */
export const ItemSilhouetteSkeleton = () => (
  <div
    aria-hidden="true"
    className="relative box-content size-8 rounded-md border-2 border-border/40 bg-muted/20"
  >
    <Skeleton className="absolute inset-1 rounded-sm" />
  </div>
);
