import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLoots } from "@/hooks/api/use-loots";
import { useGuildContext } from "@/hooks/use-guild-context";
import { Frown, Loader2 } from "lucide-react";
import { FC, Fragment, useEffect } from "react";
import { LootsListItem } from "@/screens/guild/components/loots-list/loots-list-item";
import { LootsListItemSkeleton } from "@/screens/guild/components/loots-list/loots-list-item-skeleton";
import { useDebounceValue, useIntersectionObserver } from "usehooks-ts";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { MemberSyncButton } from "@/screens/members-settings/components/member-sync-button";
import { useGuildMember } from "@/hooks/api/use-guild-member";

export const LootsList: FC = () => {
  const {
    data: loots,
    fetchNextPage,
    hasNextPage,
    isFetchedAfterMount,
  } = useLoots({});
  const { error: permissionsError } = useGuildPermissions();
  const { world } = useGuildContext();
  const { data: member, isPending } = useGuildMember();

  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 1,
  });
  const [value] = useDebounceValue(isIntersecting, 100);

  useEffect(() => {
    if (value && hasNextPage && isFetchedAfterMount) {
      fetchNextPage();
    }
  }, [value, fetchNextPage, isFetchedAfterMount, hasNextPage]);

  if (permissionsError?.response?.status === 403) {
    return (
      <div className="flex flex-col justify-center gap-8 items-center flex-1">
        <Frown size="72" />
        <span className="font-semibold text-center">
          Nie masz uprawnień do przeglądania lootów w tej gildii. <br /> Odśwież
          swoje uprawnienia jeśli dostałeś już odpowiednią rolę.
        </span>
        {!isPending && member && (
          <MemberSyncButton member={{ ...member, userId: "@me" }} />
        )}
      </div>
    );
  }

  const hasLoots = loots?.pages?.[0]?.data?.length ?? 0 >= 0;

  if (!hasLoots) {
    return (
      <div className="flex flex-col justify-center gap-8 items-center flex-1">
        <Frown size="72" />
        <span className="font-semibold">Nie znaleziono żadnych lootów.</span>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="flex flex-col justify-center gap-8 items-center flex-1">
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
