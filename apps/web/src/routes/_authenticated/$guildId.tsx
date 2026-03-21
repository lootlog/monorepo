import { createFileRoute } from "@tanstack/react-router";
import { GuildLayout } from "@/components/layout/guild-layout";

export const Route = createFileRoute("/_authenticated/$guildId")({
  beforeLoad: ({ params }) => {
    return {
      guildId: params.guildId,
    };
  },
  component: GuildLayout,
});
