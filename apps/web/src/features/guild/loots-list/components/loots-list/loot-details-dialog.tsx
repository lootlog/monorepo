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
import { cn } from "@lootlog/ui/lib/utils";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { PlayerTile } from "@/features/guild/loots-list/components/loots-list/player-tile";
import { LootDetailsActions } from "@/features/guild/loots-list/components/loots-list/loot-details-actions";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { AlertCircle, Calendar, MapPin } from "lucide-react";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useSelectedLoot } from "@/hooks/use-selected-loot";
import { useLootFromCache } from "@/hooks/use-loot-from-cache";
import { useIsOwner } from "@/hooks/context/use-is-owner";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { LOOT_SHARE_COLOR_PALETTE } from "@/features/guild/loots-list/constants/loot-share-color-palette";
import { useTranslation } from "react-i18next";
import { ThemeSurfaceOverlay } from "@/themes";
import type { Loot } from "@/lib/loots/loot-types";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  useGuildsControllerGetGuildPermissions,
} from "@/lib/api/generated/main/guilds/guilds";
import {
  getLootsControllerFetchLootByIdQueryKey,
  useLootsControllerFetchLootById,
} from "@/lib/api/generated/main/loots/loots";

const MANAGE_LOOTS_PERMISSIONS = ["LOOTLOG_MANAGE", "ADMIN"] as const;

type PlayerColorMap = Record<string, { color: string; idx: number }>;
type ItemOwnerMap = Record<string, string | undefined>;

const computeLootMaps = (loot: Loot) => {
  const playerColorMap = loot.players.reduce<PlayerColorMap>(
    (acc, player, idx) => {
      const color =
        LOOT_SHARE_COLOR_PALETTE[idx % LOOT_SHARE_COLOR_PALETTE.length] ?? "";
      acc[player.id] = { color, idx };
      return acc;
    },
    {},
  );

  const itemOwnerMap: ItemOwnerMap = {};
  Object.entries(loot.lootShare || {}).forEach(([playerId, itemIds]) => {
    itemIds.forEach((itemId) => {
      itemOwnerMap[itemId] = playerId;
    });
  });

  return { playerColorMap, itemOwnerMap };
};

const LoadingState: FC = () => (
  <div className="flex items-center justify-center h-64">
    <Spinner className="h-8 w-8 text-muted-foreground" />
  </div>
);

const NotFoundState: FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
      <AlertCircle className="h-12 w-12" />
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
  const isMobile = useIsMobile();
  const { playerColorMap, itemOwnerMap } = computeLootMaps(loot);

  return (
    <div
      className={cn(
        "flex flex-col gap-0 bg-background/95 backdrop-blur-xl border-border/50 overflow-hidden rounded-lg",
        {
          "w-full": isMobile,
        },
      )}
    >
      <ThemeSurfaceOverlay subtle rounded="rounded-lg" />
      <DialogHeader className="border-b border-border/50">
        <DialogTitle className="pb-4 flex flex-col items-start">
          <LootNpcs
            npcs={loot.npcs}
            className="p-4 pb-0 mb-2 text-left pr-12"
          />
          <div className="flex flex-col gap-1 px-4">
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {loot.location}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {t("loots.details.obtainedAt", { date })}
            </span>
          </div>
        </DialogTitle>
      </DialogHeader>
      {canManageLoots && (
        <div className="border-b border-border/50 p-4 bg-secondary/20">
          <LootDetailsActions loot={loot} />
        </div>
      )}
      <ScrollArea className="flex-1 max-h-[60vh]">
        <div className="flex flex-row gap-1 flex-wrap p-4 border-b border-border/50 bg-card/30">
          {loot.players.map((player, idx) => {
            const color = playerColorMap[player.id];
            return (
              <PlayerTile
                key={player.id}
                player={player}
                idx={idx}
                color={color?.color}
                className="scale-90"
              />
            );
          })}
        </div>
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
  const { data: permissions } = useGuildsControllerGetGuildPermissions(
    { guildId: guildId ?? "" },
    {
      query: {
        queryKey: getGuildsControllerGetGuildPermissionsQueryKey({
          guildId: guildId ?? "",
        }),
        staleTime: 30_000,
      },
    },
  );
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
        className="max-h-[85vh] p-0 sm:max-w-[28rem] overflow-hidden"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};
