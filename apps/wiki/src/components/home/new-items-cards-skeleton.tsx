import { Skeleton } from "@lootlog/ui/components/skeleton";

/** The place of a list of `NewItemsCard`s while it loads. */
export function NewItemsCardsSkeleton({ count }: { count: number }) {
  return (
    <ul className="grid gap-4 lg:grid-cols-2" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <Skeleton className="h-[7.5rem] rounded-xl" />
        </li>
      ))}
    </ul>
  );
}
