import { createLazyFileRoute } from "@tanstack/react-router";
import { GuildLayout } from "@/components/layout/guild-layout";

export const Route = createLazyFileRoute("/_authenticated/$guildId")({
  component: GuildLayout,
});
