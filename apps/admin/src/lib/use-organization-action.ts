import type { OrganizationAction } from "@/lib/organization-action";
import { organizationNoticeText, text } from "@/lib/messages";
import { usePageAction } from "@/lib/use-page-action";
import { performOrganizationAction } from "@/server/organizations";

export function useOrganizationAction(guildId: string) {
  return usePageAction<OrganizationAction, "cooldown">(
    (action) => performOrganizationAction({ data: { guildId, action } }),
    {
      done: (action) => organizationNoticeText[action],
      refused: () => text.discordCooldown,
    },
  );
}
