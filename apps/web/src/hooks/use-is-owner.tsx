import { useGuild } from "@/hooks/api/use-guild";
import { useSession } from "@/hooks/auth/use-session";

export const useIsOwner = () => {
  const { data: guild } = useGuild({});
  const session = useSession();

  return guild?.ownerId === session.data?.user?.discordId;
};
