import { createFileRoute } from "@tanstack/react-router";
import { guildNotificationJobsQueryOptions } from "@/hooks/api/guilds/use-guild-notifications";

export const Route = createFileRoute(
  "/_authenticated/$guildId/notifications/history",
)({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      guildNotificationJobsQueryOptions(params.guildId),
    );
  },
});
