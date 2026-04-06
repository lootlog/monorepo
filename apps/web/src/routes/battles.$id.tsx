import { createFileRoute } from "@tanstack/react-router";
import { PublicBattle } from "@/features/public-battle/public-battle";

export const Route = createFileRoute("/battles/$id")({
  component: PublicBattle,
});
