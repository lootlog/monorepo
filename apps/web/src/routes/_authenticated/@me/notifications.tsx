import { createFileRoute } from "@tanstack/react-router";
import { userNotificationsQueryOptions } from "@/hooks/api/user/use-user-notifications";

export const Route = createFileRoute("/_authenticated/@me/notifications")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(userNotificationsQueryOptions());
  },
});
