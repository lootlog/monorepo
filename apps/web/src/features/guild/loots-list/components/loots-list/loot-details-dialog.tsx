import type { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { LootNpcs } from "@/features/guild/loots-list/components/loots-list/loot-npcs";
import { LootComments } from "@/features/guild/loots-list/components/loots-list/loot-comments";
import { LootDetails } from "@/features/guild/loots-list/components/loots-list/loot-details";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { PlayerTile } from "@/components/tiles";
import { LootDetailsActions } from "@/features/guild/loots-list/components/loots-list/loot-details-actions";
import { AlertCircle, Calendar, MapPin } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useSelectedLoot } from "@/hooks/use-selected-loot";
import { useLootFromCache } from "@/hooks/use-loot-from-cache";
import { useIsOwner } from "@/hooks/context/use-is-owner";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useTranslation } from "react-i18next";
import type { Loot } from "@/lib/loots/loot-types";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import {
  getLootsControllerFetchLootByIdQueryKey,
  useLootsControllerFetchLootById,
} from "@lootlog/api-client/react-query/main/loots";
import { buildLootShareMaps } from "@/features/guild/loots-list/utils/build-loot-share-maps";

const MANAGE_LOOTS_PERMISSIONS = ["LOOTLOG_MANAGE", "ADMIN"] as const;

const LoadingState: FC = () => (
  <div className="flex h-64 items-center justify-center">
    <Spinner className="size-7 text-muted-foreground" />
  </div>
);

const NotFoundState: FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
      <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-card">
        <AlertCircle className="size-5" />
      </div>
      <p className="text-sm">{t("loots.details.notFound")}</p>
    </div>
  );
};

type LootDetailsContentProps = {
  loot: Loot;
  canManageLoots: boolean;
};

const LootDetailsContent: FC<LootDetailsContentProps> = ({
  loot,
  canManageLoots,
}) => {
  const { t } = useTranslation();
  const date = timestampToDate(loot.createdAt);
  const { playerColorMap, itemOwnerMap } = buildLootShareMaps(loot);

  return (
    <div className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-background">
      <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12 text-left sm:px-6 sm:py-5 sm:pr-14">
        <DialogTitle className="flex flex-col items-start px-0 pt-0">
          <LootNpcs npcs={loot.npcs} className="text-left" />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              {loot.location}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <Calendar className="size-3.5 shrink-0" />
              {t("loots.details.obtainedAt", { date })}
            </span>
          </div>
        </DialogTitle>
      </DialogHeader>
      {canManageLoots && (
        <div className="shrink-0 border-b border-border bg-card/40 px-5 py-3 sm:px-6">
          <LootDetailsActions loot={loot} />
        </div>
      )}
      <ScrollArea className="min-h-0 flex-1 sm:max-h-[65vh]">
        <section className="border-b border-border bg-card/30 px-5 py-4 sm:px-6">
          <p className="text-xs font-medium text-muted-foreground">
            {t("loots.details.participants", { count: loot.players.length })}
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            {loot.players.map((player, idx) => {
              const color = playerColorMap[player.id];
              return (
                <PlayerTile
                  key={player.id}
                  player={player}
                  idx={idx}
                  color={color?.color}
                />
              );
            })}
          </div>
        </section>
        <LootDetails loot={loot} ownerMap={itemOwnerMap} />
        <LootComments lootId={loot.id} />
      </ScrollArea>
    </div>
  );
};

export const LootDetailsDialog: FC = () => {
  const { selectedLootId, closeLootDetails, isOpen } = useSelectedLoot();
  const cachedLoot = useLootFromCache(selectedLootId);
  const guildId = useGuildId();
  const { data: permissions } = useGuildPermissions();
  const isOwner = useIsOwner();

  const {
    data: fetchedLoot,
    isLoading,
    isError,
  } = useLootsControllerFetchLootById(
    { guildId: guildId ?? "", lootId: selectedLootId ?? 0 },
    {
      query: {
        enabled: isOpen && !cachedLoot && !!guildId && !!selectedLootId,
        queryKey: getLootsControllerFetchLootByIdQueryKey({
          guildId: guildId ?? "",
          lootId: selectedLootId ?? 0,
        }),
        staleTime: 60_000,
      },
    },
  );

  const loot = cachedLoot ?? fetchedLoot;

  const canManageLoots =
    permissions?.some((permission) =>
      MANAGE_LOOTS_PERMISSIONS.includes(
        permission as (typeof MANAGE_LOOTS_PERMISSIONS)[number],
      ),
    ) || isOwner;

  const renderContent = () => {
    if (loot) {
      return <LootDetailsContent loot={loot} canManageLoots={canManageLoots} />;
    }

    if (isLoading) {
      return <LoadingState />;
    }

    if (isError || (!loot && !isLoading)) {
      return <NotFoundState />;
    }

    return <LoadingState />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeLootDetails()}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden rounded-2xl border-border bg-background p-0 sm:max-w-[36rem]"
        aria-describedby={undefined}
        initialFocus={false}
      >
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};
