import { createFileRoute } from "@tanstack/react-router";
import { PublicBattle } from "@/features/public-battle/public-battle";
import { PublicBattleSkeleton } from "@/features/public-battle/public-battle-skeleton";

export const Route = createFileRoute("/battles/$id")({
  component: PublicBattle,
  pendingComponent: PublicBattleSkeleton,
});
