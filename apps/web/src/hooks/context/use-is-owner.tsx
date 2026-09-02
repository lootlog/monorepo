import { useSession } from "@/hooks/auth/use-session";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildsControllerGetGuildById } from "@lootlog/client/main";

export const useIsOwner = () => {
  const guildId = useGuildId();
  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });
  const { data: session } = useSession();

  return guild?.ownerId === session?.user?.discordId;
};
