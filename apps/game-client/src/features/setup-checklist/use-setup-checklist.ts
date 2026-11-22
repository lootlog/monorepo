import { Schema } from "effect";
import { useSocket } from "@/contexts/socket-context";
import { getSetupChecklist } from "@/features/setup-checklist/setup-checklist-steps";
import { useSession } from "@/hooks/auth/use-session";
import { isSessionSignedOut } from "@/lib/auth-client";
import { useLootlogCharactersConfig } from "@/hooks/api/use-lootlog-characters-config";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { storageKey } from "@/lib/storage-key";
import { useGameStore } from "@/store/game.store";

const DISMISSED_KEY = storageKey("ll:setup-checklist-dismissed");

export const useSetupChecklist = () => {
  const session = useSession();

  const signedIn = session.data
    ? true
    : isSessionSignedOut(session)
      ? false
      : undefined;

  const {
    guildsQuery: { data: guilds },
  } = useLootlogGuilds();

  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );

  const { data: charactersConfig, isSuccess: isConfigLoaded } =
    useLootlogCharactersConfig({ enabled: signedIn === true });

  const { socket, status: realtimeStatus } = useSocket();

  const [dismissed, setDismissed] = useLocalStorage(
    DISMISSED_KEY,
    false,
    Schema.Boolean,
  );

  const checklist = getSetupChecklist({
    signedIn,
    guildIds: guilds?.map((guild) => guild.id),
    catchingGuildIds:
      isConfigLoaded && characterId
        ? (charactersConfig?.[characterId]?.catchingGuildIds ?? [])
        : undefined,
    realtimeStatus,
  });

  return {
    ...checklist,
    dismissed,
    setDismissed,
    reconnect: () => socket?.connect(),
  };
};
