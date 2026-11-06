import { orderGuilds } from "@lootlog/domain/guild-preferences";
import { GuildNavCreate } from "@/components/layout/guild-nav-create";
import { GuildNavItem } from "@/components/layout/guild-nav-item";
import { GuildReorderItem } from "@/components/layout/guild-reorder-item";
import { GuildsRefreshButton } from "@/components/layout/guilds-refresh-button";
import { GuildsRail } from "@/components/layout/guilds-rail";
import { LootlogStrip } from "@/components/layout/lootlog-strip";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { Reorder } from "framer-motion";
import { useState, useEffect, useLayoutEffect, useRef, type FC } from "react";
import { GuildsSelectorSkeleton } from "@/components/layout/guilds-selector-skeleton";
import { useLootUnreadCounts } from "@/contexts/loot-unread-context";
import { useUsersControllerGetCurrentUserGuilds } from "@lootlog/client/main";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshCurrentUserGuilds } from "@/lib/current-user-guilds";
import {
  useUpdateUserPreferences,
  useUserPreferences,
} from "@/hooks/api/user/use-user-preferences";

import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { RotateCcw } from "lucide-react";

// Rail entries span the rail; strip tiles keep their own width.
const ORIENTATIONS = {
  vertical: {
    variant: "rail",
    axis: "y",
    Frame: GuildsRail,
    groupClassName: "flex flex-col gap-0.5 pt-1 pb-2",
    itemClassName: "w-full",
  },
  horizontal: {
    variant: "strip",
    axis: "x",
    Frame: LootlogStrip,
    groupClassName: "flex gap-1",
    itemClassName: undefined,
  },
} as const;

const getHiddenGuildIds = (
  preferences: { hiddenGuildIds: string[] } | undefined,
) => new Set(preferences?.hiddenGuildIds);

type GuildsSelectorProps = {
  /**
   * `horizontal` is the labelled strip that opens the phone navigation
   * sheet; the desktop rail is vertical.
   */
  orientation: "vertical" | "horizontal";
  /** Called when an entry navigates or opens a dialog. */
  onSelect?: () => void;
};

export const GuildsSelector: FC<GuildsSelectorProps> = ({
  orientation,
  onSelect,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const guildsQuery = useUsersControllerGetCurrentUserGuilds();
  const guilds = guildsQuery.data;
  const preferencesQuery = useUserPreferences();
  const hiddenGuildIds = getHiddenGuildIds(preferencesQuery.data);
  const lootUnreadCounts = useLootUnreadCounts();
  const currentGuildId = useGuildId();
  const [localGuilds, setLocalGuilds] = useState<typeof guilds>();
  const [isDragging, setIsDragging] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const updateUserPreferences = useUpdateUserPreferences();

  const latestHiddenGuildIds = useRef(
    preferencesQuery.data?.hiddenGuildIds ?? [],
  );

  useLayoutEffect(() => {
    latestHiddenGuildIds.current = preferencesQuery.data?.hiddenGuildIds ?? [];
  }, [preferencesQuery.data?.hiddenGuildIds]);
  const { mutate: updatePreferences } = updateUserPreferences;

  const getOrderedGuilds = () => {
    if (!guilds?.length) {
      return [];
    }

    return orderGuilds(guilds, preferencesQuery.data?.guildsOrder);
  };

  const orderedGuilds = getOrderedGuilds();
  const orderedGuildsKey = orderedGuilds.map((guild) => guild.id).join(":");
  const pendingOrderKey = pendingOrder?.join(":");

  if (!isDragging && pendingOrder && orderedGuildsKey === pendingOrderKey) {
    setPendingOrder(null);
  }

  useEffect(() => {
    if (!isDragging && pendingOrder) {
      if (orderedGuildsKey !== pendingOrderKey) {
        updatePreferences(
          { guildsOrder: pendingOrder },
          {
            onSettled: () => setPendingOrder(null),
          },
        );
      }
    }
  }, [
    isDragging,
    orderedGuildsKey,
    pendingOrder,
    pendingOrderKey,
    updatePreferences,
  ]);

  const handleReorder = (newGuilds: typeof guilds) => {
    if (!newGuilds) return;

    setLocalGuilds(newGuilds);

    const orderIds = newGuilds.map((guild) => guild.id);
    setPendingOrder(orderIds);
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const toggleGuildVisibility = (
    guildId: string,
    guildName: string,
    isHidden: boolean,
  ) => {
    const confirmedHiddenGuildIds = preferencesQuery.data?.hiddenGuildIds ?? [];

    const nextHiddenGuildIds = isHidden
      ? confirmedHiddenGuildIds.filter(
          (hiddenGuildId) => hiddenGuildId !== guildId,
        )
      : [...confirmedHiddenGuildIds, guildId];

    updatePreferences(
      { hiddenGuildIds: nextHiddenGuildIds },
      {
        onSuccess: () => {
          toast.success(
            t(
              isHidden
                ? "settings.servers.shownToast"
                : "settings.servers.hiddenToast",
              { name: guildName },
            ),
            {
              action: {
                label: t("common.actions.undo"),
                onClick: () => {
                  const currentHiddenGuildIds = latestHiddenGuildIds.current;
                  let undoHiddenGuildIds = currentHiddenGuildIds;

                  if (isHidden && !currentHiddenGuildIds.includes(guildId)) {
                    undoHiddenGuildIds = [...currentHiddenGuildIds, guildId];
                  } else if (!isHidden) {
                    undoHiddenGuildIds = currentHiddenGuildIds.filter(
                      (hiddenGuildId) => hiddenGuildId !== guildId,
                    );
                  }

                  updatePreferences({
                    hiddenGuildIds: undoHiddenGuildIds,
                  });
                },
              },
            },
          );
        },
        onError: () => {
          toast.error(t("settings.servers.saveError"));
        },
      },
    );
  };

  const refreshGuilds = useMutation({
    mutationFn: () => refreshCurrentUserGuilds(queryClient),
    onError: () => {
      toast.error(t("layout.guildsSelector.refreshError"));
    },
  });

  const guildList =
    isDragging || (pendingOrderKey && pendingOrderKey !== orderedGuildsKey)
      ? (localGuilds ?? orderedGuilds)
      : orderedGuilds;

  const { variant, axis, groupClassName, itemClassName, Frame } =
    ORIENTATIONS[orientation];

  const content =
    (guildsQuery.isError && !guilds) ||
    (preferencesQuery.isError && preferencesQuery.data === undefined) ? (
      <div className="flex h-12 items-center justify-center">
        <Button
          size="icon-lg"
          variant="ghost"
          aria-label={t("settings.servers.loadError")}
          loading={guildsQuery.isFetching || preferencesQuery.isFetching}
          onClick={() => {
            void guildsQuery.refetch();
            void preferencesQuery.refetch();
          }}
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
    ) : guildsQuery.isLoading ||
      preferencesQuery.isLoading ||
      preferencesQuery.data === undefined ? (
      <GuildsSelectorSkeleton orientation={orientation} />
    ) : (
      <>
        <Reorder.Group
          axis={axis}
          values={guildList}
          onReorder={handleReorder}
          className={groupClassName}
          as="div"
        >
          {guildList.map((guild) => (
            <GuildReorderItem
              key={guild.id}
              value={guild}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              className={itemClassName}
            >
              <div className={itemClassName}>
                <GuildNavItem
                  guild={guild}
                  variant={variant}
                  onSelect={onSelect}
                  isDragging={isDragging}
                  currentGuildId={currentGuildId}
                  unreadLootsCount={lootUnreadCounts[guild.id] ?? 0}
                  isHidden={hiddenGuildIds.has(guild.id)}
                  onToggleHidden={() =>
                    toggleGuildVisibility(
                      guild.id,
                      guild.name,
                      hiddenGuildIds.has(guild.id),
                    )
                  }
                />
              </div>
            </GuildReorderItem>
          ))}
        </Reorder.Group>
        <GuildNavCreate variant={variant} onSelect={onSelect} />
        <GuildsRefreshButton
          variant={variant}
          isRefreshing={refreshGuilds.isPending}
          onRefresh={() => refreshGuilds.mutate()}
        />
      </>
    );

  return <Frame onSelect={onSelect}>{content}</Frame>;
};
