import { GuildNavCreate } from "@/components/layout/guild-nav-create";
import { GuildNavItem } from "@/components/layout/guild-nav-item";
import { InstallButton } from "@/components/layout/install-button";
import { UserNavItem } from "@/components/layout/user-nav-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useUpdateUserPreferences } from "@/hooks/api/use-update-user-preferences";
import { useUser } from "@/hooks/api/use-user";
import { Reorder } from "framer-motion";
import { FC, useState, useEffect, useCallback, useMemo } from "react";

export const GuildsNav: FC = () => {
  const { data: guilds } = useGuilds();
  const { user } = useUser();
  const [guildsState, setGuildsState] = useState<typeof guilds>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const { mutate: updateUserPreferences } = useUpdateUserPreferences();

  const orderedGuilds = useMemo(() => {
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
  }, [guilds, user?.preferences?.guildsOrder]);

  useEffect(() => {
    setGuildsState(orderedGuilds);
  }, [orderedGuilds]);

  useEffect(() => {
    if (!isDragging && pendingOrder) {
      updateUserPreferences({
        guildsOrder: pendingOrder,
      });
      setPendingOrder(null);
    }
  }, [isDragging, pendingOrder, updateUserPreferences]);

  const handleReorder = useCallback((newGuilds: typeof guilds) => {
    if (!newGuilds) return;

    setGuildsState(newGuilds);

    const orderIds = newGuilds.map((guild) => guild.id);
    setPendingOrder(orderIds);
  }, []);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const guildList = guildsState || [];

  return (
    <div className="flex h-full flex-col gap-2 w-16 border-r border-solid pt-2">
      <UserNavItem />
      <Separator className="-mt-[1px]" />
      <ScrollArea className="flex-1">
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
              dragListener={true}
              dragControls={undefined}
            >
              <GuildNavItem guild={guild} isDragging={isDragging} />
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
