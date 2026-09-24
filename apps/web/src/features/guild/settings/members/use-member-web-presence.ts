import { useOrganizationPresence } from "@/hooks/use-organization-presence";

export const useMemberWebPresence = (guildId: string | undefined) =>
  useOrganizationPresence(guildId).web;
