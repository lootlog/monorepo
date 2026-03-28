import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$guildId/activity-logs")(
  {},
);
