import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$guildId/stats/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$guildId/stats/kills",
      params: { guildId: params.guildId },
    });
  },
});
