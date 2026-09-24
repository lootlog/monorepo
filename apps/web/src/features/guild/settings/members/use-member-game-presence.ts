import { useOrganizationPresence } from "@/hooks/use-organization-presence";

export const useMemberGamePresence = (guildId: string | undefined) =>
  useOrganizationPresence(guildId).game;
