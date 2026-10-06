import { useEffect } from "react";
import { useLootlogCharactersConfig } from "@/hooks/api/use-lootlog-characters-config";
import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import { npcPresenceReporter } from "./npc-presence-reporter";

const NO_ORGANIZATIONS: readonly string[] = [];

export const useNpcPresenceReporter = (): void => {
  const connected = useGlobalStore((state) => state.socketState.connected);
  const joined = useGlobalStore((state) => state.socketState.joined);
  const world = useGameStore((state) => state.game?.world ?? null);

  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? null,
  );

  const { data: charactersConfig } = useLootlogCharactersConfig();

  // A loaded configuration without this character catches for no Organization.
  const organizationIds =
    charactersConfig && characterId
      ? (charactersConfig[characterId]?.catchingGuildIds ?? NO_ORGANIZATIONS)
      : undefined;

  useEffect(() => {
    const socket = getSocket();

    npcPresenceReporter.configure({
      ready: connected && joined && socket.supportsNpcPresence(),
      world,
      characterId,
      organizationIds,
      send: (report) => socket.reportNpcPresence(report),
    });
  }, [characterId, connected, joined, organizationIds, world]);

  useEffect(() => () => npcPresenceReporter.shutdown(), []);
};
