import { useSession } from "@/hooks/auth/use-session";

/**
 * Tells whether a member's Discord user id is the signed-in viewer's, so a
 * ranking can mark their own place. Nothing matches while the session loads.
 */
export const useIsViewer = () => {
  const { data: session } = useSession();
  const viewerDiscordId = session?.user?.discordId;

  return (discordUserId: string | null | undefined) =>
    Boolean(viewerDiscordId && discordUserId === viewerDiscordId);
};
