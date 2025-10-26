import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Separator } from "@lootlog/ui/components/separator";
import { useLoots } from "@/hooks/api/loots/use-loots";
import { Frown, Loader2 } from "lucide-react";
import { Fragment, useEffect, useRef, type FC } from "react";
import { LootsListItem } from "@/features/guild/components/loots-list/loots-list-item";
import { LootsListItemSkeleton } from "@/features/guild/components/loots-list/loots-list-item-skeleton";
import { useIntersectionObserver } from "usehooks-ts";
import {
  Permission,
  useGuildPermissions,
} from "@/hooks/api/guilds/use-guild-permissions";
import { MemberSyncButton } from "@/features/members-settings/components/member-sync-button";
import { useGuildMember } from "@/hooks/api/members/use-guild-member";
import { useIsOwner } from "@/hooks/context/use-is-owner";
import { useGuildContext } from "@/hooks/context/use-guild-context";

const MANAGE_LOOTS_PERMISIONS = [Permission.LOOTLOG_MANAGE, Permission.ADMIN];
const LOOTS_PAGE_LIMIT = 20;

export const LootsList: FC = () => {
  const {
    data: loots,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading,
  } = useLoots({ limit: LOOTS_PAGE_LIMIT });

  const { data: permissions, error: permissionsError } = useGuildPermissions();
  const { world } = useGuildContext();
  const { data: member, isPending } = useGuildMember();
  const isOwner = useIsOwner();
  const fetchTimeoutRef = useRef<number | null>(null);

  const canManageLoots =
    permissions?.some((p) => MANAGE_LOOTS_PERMISIONS.includes(p)) || isOwner;

  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0,
    rootMargin: "200px",
  });

  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    if (isIntersecting && hasNextPage && !isFetching) {
      fetchTimeoutRef.current = window.setTimeout(() => {
        fetchNextPage();
      }, 100);
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [isIntersecting, hasNextPage, isFetching, fetchNextPage]);

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
    <ScrollArea id="loots-list" className="h-24 flex-1 relative">
      {isLoading ? (
        <ul>
          {Array.from({ length: 12 }).map((_, index) => (
            <LootsListItemSkeleton key={index} index={index} />
          ))}
        </ul>
      ) : (
        <>
          {loots && (
            <ul className="flex flex-col">
              {loots.pages.map((page) =>
                page.data.map((loot) => (
                  <Fragment key={loot.id}>
                    <LootsListItem
                      loot={loot}
                      canManageLoots={canManageLoots}
                    />
                    <Separator />
                  </Fragment>
                )),
              )}
            </ul>
          )}

          {hasNextPage && (
            <div
              className="relative flex items-center justify-center gap-3 border-t border-border/50 bg-secondary/30"
              style={{ height: "137px" }}
            >
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground font-medium">
                Ładowanie kolejnych lootów...
              </span>
              <div
                ref={ref}
                className="absolute bottom-[20px] h-px w-full"
                aria-hidden="true"
              />
            </div>
          )}

          {!hasNextPage && loots && loots.pages.length > 0 && (
            <div className="flex items-center justify-center py-6 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                To już wszystkie looty
              </span>
            </div>
          )}
        </>
      )}
    </ScrollArea>
  );
};
