import { createFileRoute } from "@tanstack/react-router";
import { Timers } from "@/features/timers/timers";

export const Route = createFileRoute("/_authenticated/$guildId/timers")({
  component: Timers,
});
