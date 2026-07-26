import { GuildNavCreate } from "@/components/layout/guild-nav-create";
import { GuildNavItem } from "@/components/layout/guild-nav-item";
import { InstallButton } from "@/components/layout/install-button";
import { UserNavItem } from "@/components/layout/user-nav-item";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { Reorder, motion } from "framer-motion";
import { useState, useEffect, type FC } from "react";
import { GuildsSelectorSkeleton } from "@/components/layout/guilds-selector-skeleton";
import { useUser } from "@/hooks/api/user/use-user";
import { useGateway } from "@/hooks/utils/use-gateway";
import { Separator } from "@lootlog/ui/components/separator";
import { BrandNavItem } from "@/components/layout/brand-nav-item";
import {
  useSetUsersControllerGetUserPreferencesQueryData,
  useUsersControllerGetCurrentUserGuilds,
  useUsersControllerUpdateUserPreferences,
} from "@lootlog/api-client/react-query/main/users";

export const GuildsSelector: FC = () => {
  const { data: guilds, isLoading } = useUsersControllerGetCurrentUserGuilds();
  const { user } = useUser();
  const { lootUnreadCounts } = useGateway();
  const currentGuildId = useGuildId();
  const [localGuilds, setLocalGuilds] = useState<typeof guilds>();
  const [isDragging, setIsDragging] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const setUserPreferences = useSetUsersControllerGetUserPreferencesQueryData();
  const { mutate: updateUserPreferences } =
    useUsersControllerUpdateUserPreferences({
      mutation: {
        onSuccess: (updatedPreferences) => {
          setUserPreferences(updatedPreferences);
        },
      },
    });

  const getOrderedGuilds = () => {
    if (!guilds?.length) {
      return [];
    }

    const savedOrder = user?.preferences?.guildsOrder;
    if (!savedOrder?.length) {
      return guilds;
    }

    try {
      const guildMap = new Map(guilds.map((guild) => [guild.id, guild]));

      const ordered = savedOrder
        .map((id: string) => guildMap.get(id))
        .filter(Boolean) as typeof guilds;

      const orderedIds = new Set(savedOrder);
      const newGuilds = guilds.filter((guild) => !orderedIds.has(guild.id));

      return [...ordered, ...newGuilds];
    } catch {
      return guilds;
    }
  };
  const orderedGuilds = getOrderedGuilds();
  const orderedGuildsKey = orderedGuilds.map((guild) => guild.id).join(":");
  const pendingOrderKey = pendingOrder?.join(":");

  useEffect(() => {
    if (!isDragging && pendingOrder) {
      if (orderedGuildsKey !== pendingOrderKey) {
        updateUserPreferences({
          data: {
            guildsOrder: pendingOrder,
          },
        });
      }
    }
  }, [
    isDragging,
    orderedGuildsKey,
    pendingOrder,
    pendingOrderKey,
    updateUserPreferences,
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

  const guildList =
    isDragging || (pendingOrderKey && pendingOrderKey !== orderedGuildsKey)
      ? (localGuilds ?? orderedGuilds)
      : orderedGuilds;

  return (
    <div className="flex flex-col gap-2 w-16 border-r border-solid pt-2 pb-2 h-full overflow-hidden">
      <BrandNavItem />
      <Separator className="-mt-[1px]" />
      <UserNavItem />
      <Separator className="-mt-[1px]" />
      <ScrollArea className="flex-1 h-24">
        {isLoading ? (
          <GuildsSelectorSkeleton />
        ) : (
          <Reorder.Group
            axis="y"
            values={guildList}
            onReorder={handleReorder}
            className="flex flex-col gap-0.5"
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
