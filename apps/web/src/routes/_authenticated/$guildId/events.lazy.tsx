import { createLazyFileRoute } from "@tanstack/react-router";
import { Events } from "@/features/events/events";

export const Route = createLazyFileRoute("/_authenticated/$guildId/events")({
  component: Events,
});
