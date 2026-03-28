import { createLazyFileRoute } from "@tanstack/react-router";
import { Guild } from "@/features/guild/guild";

export const Route = createLazyFileRoute("/_authenticated/$guildId/")({
  component: Guild,
});
