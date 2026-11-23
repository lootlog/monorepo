import { useNavigate, useRouter } from "@tanstack/react-router";
import type { OrganizationAction } from "@/lib/organization-action";
import { usePageAction } from "@/lib/use-page-action";
import { performOrganizationAction } from "@/server/organizations";

export function useOrganizationAction(guildId: string) {
  const router = useRouter();
  const navigate = useNavigate();

  return usePageAction<OrganizationAction, "cooldown">(
    (action) => performOrganizationAction({ data: { guildId, action } }),
    async (outcome) => {
      const page = router.buildLocation({
        to: "/organizations/$guildId",
        params: { guildId },
      }).pathname;

      if (router.state.location.pathname !== page) return;

      await navigate({
        to: "/organizations/$guildId",
        params: { guildId },
        search: (previous) => ({
          ...previous,
          notice: outcome.notice,
          error: outcome.error,
        }),
        replace: true,
      });
    },
  );
}
