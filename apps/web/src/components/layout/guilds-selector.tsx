import { GuildNavCreate } from "@/components/layout/guild-nav-create";
import { GuildNavItem } from "@/components/layout/guild-nav-item";
import { InstallButton } from "@/components/layout/install-button";
import { UserNavItem } from "@/components/layout/user-nav-item";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { Reorder, motion } from "framer-motion";
import { useState, useEffect, useRef, type FC } from "react";
import { GuildsSelectorSkeleton } from "@/components/layout/guilds-selector-skeleton";
import { useGateway } from "@/hooks/utils/use-gateway";
import { Separator } from "@lootlog/ui/components/separator";
import { useUsersControllerGetCurrentUserGuilds } from "@lootlog/api-client/react-query/main/users";
import {
  useUpdateUserPreferences,
  useUserPreferences,
} from "@/hooks/api/user/use-user-preferences";
import { orderGuilds } from "@/features/user/settings/servers/server-visibility";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { RotateCcw } from "lucide-react";

export const GuildsSelector: FC = () => {
  const { t } = useTranslation();
  const guildsQuery = useUsersControllerGetCurrentUserGuilds();
  const guilds = guildsQuery.data;
  const preferencesQuery = useUserPreferences();
  const { lootUnreadCounts } = useGateway();
  const currentGuildId = useGuildId();
  const [localGuilds, setLocalGuilds] = useState<typeof guilds>();
  const [isDragging, setIsDragging] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const updateUserPreferences = useUpdateUserPreferences();
  const latestHiddenGuildIds = useRef(
    preferencesQuery.data?.hiddenGuildIds ?? [],
  );
  latestHiddenGuildIds.current = preferencesQuery.data?.hiddenGuildIds ?? [];

  const getOrderedGuilds = () => {
    if (!guilds?.length) {
      return [];
    }

    return orderGuilds(guilds, preferencesQuery.data?.guildsOrder);
  };
  const orderedGuilds = getOrderedGuilds();
  const orderedGuildsKey = orderedGuilds.map((guild) => guild.id).join(":");
  const pendingOrderKey = pendingOrder?.join(":");

  useEffect(() => {
    if (!isDragging && pendingOrder) {
      if (orderedGuildsKey !== pendingOrderKey) {
        updateUserPreferences.mutate(
          { guildsOrder: pendingOrder },
          {
            onSettled: () => setPendingOrder(null),
          },
        );
      } else {
        setPendingOrder(null);
      }
    }
  }, [
    isDragging,
    orderedGuildsKey,
    pendingOrder,
    pendingOrderKey,
    updateUserPreferences.mutate,
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

    updateUserPreferences.mutate(
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

                  updateUserPreferences.mutate({
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

  const guildList =
    isDragging || (pendingOrderKey && pendingOrderKey !== orderedGuildsKey)
      ? (localGuilds ?? orderedGuilds)
      : orderedGuilds;

  return (
    <div className="flex flex-col gap-2 w-16 border-r border-solid pt-2 pb-2 h-full overflow-hidden">
      <UserNavItem />
      <Separator className="-mt-[1px]" />
      <ScrollArea className="flex-1 h-24">
        {(guildsQuery.isError && !guilds) ||
        (preferencesQuery.isError && preferencesQuery.data === undefined) ? (
          <div className="flex h-12 items-center justify-center">
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("settings.servers.loadError")}
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
          <GuildsSelectorSkeleton />
        ) : (
          <Reorder.Group
            axis="y"
            values={guildList}
            onReorder={handleReorder}
            className="flex flex-col gap-0.5 py-2"
            as="div"
          >
            {guildList.map((guild, index) => (
              <Reorder.Item
                key={guild.id}
                value={guild}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                className="w-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                whileDrag={{
                  scale: 1.1,
                  zIndex: 50,
                  transition: { type: "spring", stiffness: 300, damping: 30 },
                }}
                dragListener
                dragControls={undefined}
              >
                <motion.div
                  className="w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.03,
                    ease: "easeOut",
                  }}
                >
                  <GuildNavItem
                    guild={guild}
                    isDragging={isDragging}
                    currentGuildId={currentGuildId}
                    unreadLootsCount={lootUnreadCounts[guild.id] ?? 0}
                    isHidden={
                      preferencesQuery.data?.hiddenGuildIds.includes(
                        guild.id,
                      ) ?? false
                    }
                    onToggleHidden={() =>
                      toggleGuildVisibility(
                        guild.id,
                        guild.name,
                        preferencesQuery.data?.hiddenGuildIds.includes(
                          guild.id,
                        ) ?? false,
                      )
                    }
                  />
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </ScrollArea>
      <Separator />
      <div className="flex items-center justify-center">
        <GuildNavCreate />
      </div>
      <Separator />
      <div className="flex items-center justify-center">
        <InstallButton />
      </div>
    </div>
  );
};
