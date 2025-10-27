import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Separator } from "@lootlog/ui/components/separator";
import { useLoots } from "@/hooks/api/loots/use-loots";
import { Frown, Loader2 } from "lucide-react";
import { useEffect, useRef, type FC } from "react";
import { LootsListItem } from "@/features/guild/components/loots-list/loots-list-item";
import { LootsListItemSkeleton } from "@/features/guild/components/loots-list/loots-list-item-skeleton";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Permission,
  useGuildPermissions,
} from "@/hooks/api/guilds/use-guild-permissions";
import { MemberSyncButton } from "@/features/members-settings/components/member-sync-button";
import { useGuildMember } from "@/hooks/api/members/use-guild-member";
import { useIsOwner } from "@/hooks/context/use-is-owner";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useGuildId } from "@/hooks/context/use-guild-id";

const MANAGE_LOOTS_PERMISIONS = [Permission.LOOTLOG_MANAGE, Permission.ADMIN];
const LOOTS_PAGE_LIMIT = 20;

export const LootsList: FC = () => {
  const {
    data: loots,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useLoots({ limit: LOOTS_PAGE_LIMIT });

  const { data: permissions, error: permissionsError } = useGuildPermissions();
  const { world } = useGuildContext();
  const { data: member, isPending } = useGuildMember();
  const isOwner = useIsOwner();
  const guildId = useGuildId();
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const canManageLoots =
    permissions?.some((p) => MANAGE_LOOTS_PERMISIONS.includes(p)) || isOwner;

  const allLoots = loots?.pages.flatMap((page) => page.data) ?? [];
  const totalCount = allLoots.length;

  const virtualizer = useVirtualizer({
    count: totalCount + 1,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: (index) => (index === totalCount ? 60 : 138),
    overscan: 5,
    useAnimationFrameWithResizeObserver: true,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const [lastItem] = [...virtualItems].reverse();

    if (!lastItem) return;

    if (
      lastItem.index >= totalCount - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    totalCount,
    isFetchingNextPage,
    virtualItems,
  ]);

  useEffect(() => {
    scrollElementRef.current?.scrollTo(0, 0);
  }, [guildId]);

  if (
    permissionsError &&
    "response" in permissionsError &&
    permissionsError.response &&
    typeof permissionsError.response === "object" &&
    "status" in permissionsError.response &&
    permissionsError.response.status === 403
  ) {
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

  const hasLoots = (loots?.pages?.[0]?.data?.length ?? 0) > 0;

  if (!isLoading && !hasLoots) {
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
    <ScrollArea
      id="loots-list"
      className="h-24 flex-1 relative"
      ref={scrollElementRef}
    >
      {isLoading ? (
        <ul>
          {Array.from({ length: 12 }).map((_, index) => (
            <LootsListItemSkeleton key={index} index={index} />
          ))}
        </ul>
      ) : (
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualItem) => {
            const isLoaderRow = virtualItem.index > totalCount - 1;
            const loot = allLoots[virtualItem.index];

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {isLoaderRow ? (
                  hasNextPage ? (
                    <div
                      className="relative flex items-center justify-center gap-3 border-t border-border/50 bg-secondary/30"
                      style={{ height: "60px" }}
                    >
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground font-medium">
                        Ładowanie kolejnych lootów...
                      </span>
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center border-t border-border/50"
                      style={{ height: "60px" }}
                    >
                      <span className="text-xs text-muted-foreground">
                        To już wszystkie looty
                      </span>
                    </div>
                  )
                ) : loot ? (
                  <>
                    <LootsListItem
                      loot={loot}
                      canManageLoots={canManageLoots}
                    />
                    <Separator />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
};
