import { createFileRoute } from "@tanstack/react-router";
import { FactionWarRanking } from "@/features/user/faction-war/faction-war-ranking";

export const Route = createFileRoute("/_authenticated/@me/faction-war/ranking")(
  {
    component: FactionWarRanking,
  },
);
