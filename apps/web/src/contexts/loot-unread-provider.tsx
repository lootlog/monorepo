import {
  useEffect,
  useEffectEvent,
  useState,
  type PropsWithChildren,
} from "react";
import { mapValues } from "es-toolkit";
import { useUsersControllerGetCurrentUserAccessibleGuilds } from "@lootlog/client/main";
import type { GuildLootCreatedEventV2 } from "@lootlog/schema/loot-events";
import { GatewayEvent } from "@/config/gateway";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGateway } from "@/hooks/utils/use-gateway";
import { LootUnreadContext } from "./loot-unread-context";

export const LootUnreadProvider = ({ children }: PropsWithChildren) => {
  const { socket } = useGateway();
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds();
  const routeGuildId = useGuildId();

  const currentGuildId = guilds?.find(
    (guild) => guild.id === routeGuildId || guild.vanityUrl === routeGuildId,
  )?.id;

  const [unreadLootIdsByGuild, setUnreadLootIdsByGuild] = useState<
    Record<string, number[]>
  >({});

  const handleLootCreate = useEffectEvent(
    (payload: GuildLootCreatedEventV2) => {
      if (payload.guildId === currentGuildId) return;
      setUnreadLootIdsByGuild((previous) => {
        const lootIds = previous[payload.guildId] ?? [];

        if (lootIds.includes(payload.lootId)) return previous;

        return { ...previous, [payload.guildId]: [...lootIds, payload.lootId] };
      });
    },
  );

  useEffect(() => {
    socket.on(GatewayEvent.LOOTS_CREATE, handleLootCreate);

    return () => {
      socket.off(GatewayEvent.LOOTS_CREATE, handleLootCreate);
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
