import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/edit/",
)({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$guildId/events/$eventId/edit/settings",
      params: {
        guildId: params.guildId,
        eventId: params.eventId,
      },
    });
  },
});
