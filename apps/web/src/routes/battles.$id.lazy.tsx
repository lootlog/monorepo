import { createLazyFileRoute } from "@tanstack/react-router";
import { PublicBattle } from "@/features/public-battle/public-battle";

export const Route = createLazyFileRoute("/battles/$id")({
  component: PublicBattle,
});
