import { createLazyFileRoute } from "@tanstack/react-router";
import { Timers } from "@/features/timers/timers";

export const Route = createLazyFileRoute("/_authenticated/$guildId/timers")({
  component: Timers,
});
