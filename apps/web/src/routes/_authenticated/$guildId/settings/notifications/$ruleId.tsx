import { createFileRoute } from "@tanstack/react-router";
import { guildAvailableNotificationTargetsQueryOptions } from "@/hooks/api/guilds/use-guild-notifications";

export const Route = createFileRoute(
  "/_authenticated/$guildId/settings/notifications/$ruleId",
)({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      guildAvailableNotificationTargetsQueryOptions(params.guildId),
    );
  },
});
