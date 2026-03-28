import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/player-vs-player/$myId/$opponentId",
)({});
