import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/$guildId/events_/$eventId_/heroes_/$heroId",
)({});
