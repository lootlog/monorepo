import { useNavigate } from "@tanstack/react-router";
import type { OrganizationAction } from "@/lib/organization-action";
import { usePageAction } from "@/lib/use-page-action";
import { performOrganizationAction } from "@/server/organizations";

export function useOrganizationAction(guildId: string) {
  const navigate = useNavigate({ from: "/organizations/$guildId" });

  return usePageAction<OrganizationAction, "cooldown">(
    (action) => performOrganizationAction({ data: { guildId, action } }),
    (outcome) =>
      navigate({
        search: (previous) => ({
          ...previous,
          notice: outcome.notice,
          error: outcome.error,
        }),
        replace: true,
      }),
  );
}
