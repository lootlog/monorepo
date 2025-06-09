import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLoots } from "@/hooks/api/use-loots";
import { useGuildContext } from "@/hooks/use-guild-context";
import { Frown, Loader2 } from "lucide-react";
import { FC, Fragment, useEffect } from "react";
import { LootsListItem } from "@/screens/guild/components/loots-list/loots-list-item";
import { LootsListItemSkeleton } from "@/screens/guild/components/loots-list/loots-list-item-skeleton";
import { useDebounceValue, useIntersectionObserver } from "usehooks-ts";

export const LootsList: FC = () => {
  const {
    data: loots,
    fetchNextPage,
    hasNextPage,
    isFetchedAfterMount,
  } = useLoots({});
  const { world } = useGuildContext();

  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 1,
  });
  const [value] = useDebounceValue(isIntersecting, 100);

  useEffect(() => {
    if (value && hasNextPage && isFetchedAfterMount) {
      fetchNextPage();
    }
  }, [value, fetchNextPage, isFetchedAfterMount, hasNextPage]);

  if (!world) {
    return (
      <div className="flex flex-col justify-center gap-8 items-center mt-48">
        <Frown size="72" />
        <span className="font-semibold">
          Brak wybranego świata, wybierz go z listy na górze.
        </span>
      </div>
    );
  }

  return (
    <ScrollArea id="loots-list" className="h-full flex-1 relative">
      {loots && (
        <ul className="flex flex-col">
          {loots.pages.map((page) =>
            page.data.map((loot) => {
              return (
                <Fragment key={loot.id}>
                  <LootsListItem key={loot.id} loot={loot} />
                  <Separator />
                </Fragment>
              );
            })
          )}
        </ul>
      )}
      {!loots ||
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        (loots?.pages[0].data.length <= 0 && (
          <div className="flex flex-col justify-center gap-8 items-center mt-48">
            <Frown size="72" />
            <span className="font-semibold">
              Nie znaleziono żadnych lootów.
            </span>
          </div>
        ))}

      {!isFetchedAfterMount && (
        <ul>
          {Array.from({ length: 12 }).map((_, index) => {
            return <LootsListItemSkeleton key={index} />;
          })}
        </ul>
      )}
      {hasNextPage && (
        <div ref={ref} className="h-24 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </ScrollArea>
  );
};
