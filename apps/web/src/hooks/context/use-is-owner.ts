import { useSession } from "@/hooks/auth/use-session";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildsControllerGetGuildById } from "@lootlog/client/main";

/**
 * Both ids are undefined while the guild and session queries are loading, so
 * they must never be compared directly: that would grant owner-only UI.
 */
export const isGuildOwner = (
  ownerId: string | null | undefined,
  discordId: string | null | undefined,
) => Boolean(ownerId && discordId && ownerId === discordId);

export const useIsOwner = () => {
  const guildId = useGuildId();

  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });

  const { data: session } = useSession();

  return isGuildOwner(guild?.ownerId, session?.user?.discordId);
};
