import {
  useEffect,
  useEffectEvent,
  useState,
  type PropsWithChildren,
} from "react";
import { mapValues } from "es-toolkit";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import type { LootSnapshotEvent } from "@lootlog/protocol/realtime";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGateway } from "@/hooks/utils/use-gateway";
import { findGuildByRouteId } from "@/lib/current-user-guilds";
import { LootUnreadContext } from "./loot-unread-context";

export const LootUnreadProvider = ({ children }: PropsWithChildren) => {
  const { socket } = useGateway();
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();
  const routeGuildId = useGuildId();

  const currentGuildId = findGuildByRouteId(guilds, routeGuildId)?.id;

  const [unreadLootIdsByGuild, setUnreadLootIdsByGuild] = useState<
    Record<string, number[]>
  >({});

  // The Web app reads each new loot once, as `loot.snapshot`.
  const handleLootSnapshot = useEffectEvent((payload: LootSnapshotEvent) => {
    if (payload.guildId === currentGuildId) return;
    setUnreadLootIdsByGuild((previous) => {
      const lootIds = previous[payload.guildId] ?? [];

      if (lootIds.includes(payload.lootId)) return previous;

      return { ...previous, [payload.guildId]: [...lootIds, payload.lootId] };
    });
  });

  useEffect(() => {
    socket.on("loot.snapshot", handleLootSnapshot);

    return () => {
      socket.off("loot.snapshot", handleLootSnapshot);
    };
  }, [socket]);

  if (currentGuildId && unreadLootIdsByGuild[currentGuildId]) {
    const next = { ...unreadLootIdsByGuild };
    delete next[currentGuildId];
    setUnreadLootIdsByGuild(next);
  }

  const counts = mapValues(unreadLootIdsByGuild, (lootIds) => lootIds.length);

  return <LootUnreadContext value={counts}>{children}</LootUnreadContext>;
};
