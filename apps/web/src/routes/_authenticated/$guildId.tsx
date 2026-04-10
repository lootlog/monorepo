import { createFileRoute } from "@tanstack/react-router";
import { GuildLayout } from "@/components/layout/guild-layout";

export const Route = createFileRoute("/_authenticated/$guildId")({
  component: GuildLayout,
  beforeLoad: ({ params }) => {
    return {
      guildId: params.guildId,
    };
  },
});
