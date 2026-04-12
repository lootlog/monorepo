import { GuildNavCreate } from "@/components/layout/guild-nav-create";
import { GuildNavItem } from "@/components/layout/guild-nav-item";
import { InstallButton } from "@/components/layout/install-button";
import { UserNavItem } from "@/components/layout/user-nav-item";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Separator } from "@lootlog/ui/components/separator";
import { useGuilds } from "@/hooks/api/guilds/use-guilds";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { Reorder } from "framer-motion";
import { useState, useEffect, type FC } from "react";
import { useUser } from "@/hooks/api/user/use-user";
import { useUpdateUserPreferences } from "@/hooks/api/user/use-update-user-preferences";

export const GuildsSelector: FC = () => {
  const { data: guilds } = useGuilds();
  const { user } = useUser();
  const currentGuildId = useGuildId();
  const [localGuilds, setLocalGuilds] = useState<typeof guilds>();
  const [isDragging, setIsDragging] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const { mutate: updateUserPreferences } = useUpdateUserPreferences();

  const orderedGuilds = (() => {
    if (!guilds?.length) return [];

    const savedOrder = user?.preferences?.guildsOrder;
    if (!savedOrder?.length) return guilds;

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
  })();

  useEffect(() => {
    if (!isDragging && pendingOrder) {
      const orderedGuildsKey = orderedGuilds.map((guild) => guild.id).join(":");
      const pendingOrderKey = pendingOrder.join(":");

      if (orderedGuildsKey !== pendingOrderKey) {
        updateUserPreferences({
          guildsOrder: pendingOrder,
        });
      }
    }
  }, [isDragging, orderedGuilds, pendingOrder, updateUserPreferences]);

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

  const orderedGuildsKey = orderedGuilds.map((guild) => guild.id).join(":");
  const pendingOrderKey = pendingOrder?.join(":");
  const guildList =
    isDragging || (pendingOrderKey && pendingOrderKey !== orderedGuildsKey)
      ? (localGuilds ?? orderedGuilds)
      : orderedGuilds;

  return (
    <div className="flex flex-col gap-2 w-16 border-r border-solid pt-2 h-full">
      <UserNavItem />
      <Separator className="-mt-[1px]" />
      <ScrollArea className="flex-1 h-24">
        <Reorder.Group
          axis="y"
          values={guildList}
          onReorder={handleReorder}
          className="flex flex-col"
          as="div"
        >
          {guildList.map((guild) => (
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
              <GuildNavItem
                guild={guild}
                isDragging={isDragging}
                currentGuildId={currentGuildId}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </ScrollArea>
      <Separator />
      <div className="flex items-center justify-center">
        <GuildNavCreate />
      </div>
      <Separator />
      <div className="flex items-center justify-center pb-2">
        <InstallButton />
      </div>
    </div>
  );
};
