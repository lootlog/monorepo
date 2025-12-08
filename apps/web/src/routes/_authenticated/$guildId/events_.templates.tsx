import { createFileRoute } from "@tanstack/react-router";
import { Templates } from "@/features/events/templates";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/templates",
)({
  component: Templates,
});
