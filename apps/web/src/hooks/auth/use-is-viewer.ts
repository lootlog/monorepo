import { useSession } from "@/hooks/auth/use-session";

export const useIsViewer = () => {
  const { data: session } = useSession();
  const viewerDiscordId = session?.user?.discordId;

  return (discordUserId: string | null | undefined) =>
    Boolean(viewerDiscordId && discordUserId === viewerDiscordId);
};
