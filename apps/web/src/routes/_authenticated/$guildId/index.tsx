import { createFileRoute } from "@tanstack/react-router";
import { Guild } from "@/features/guild/guild";

export const Route = createFileRoute("/_authenticated/$guildId/")({
  component: Guild,
});
