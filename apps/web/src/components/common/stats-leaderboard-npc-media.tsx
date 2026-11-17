import type { NpcTileNpc } from "@lootlog/ui/components/npc-tile";
import { NpcTile } from "@/components/tiles/npc-tile";

type StatsLeaderboardNpcMediaProps = {
  npc: NpcTileNpc;
};

/** An NPC sprite as `StatsLeaderboardRow` media. */
export function StatsLeaderboardNpcMedia({
  npc,
}: StatsLeaderboardNpcMediaProps) {
  return (
    // Capped below the row's 48px so a tall sprite never grows it.
    <span className="w-8 shrink-0">
      <NpcTile className="h-9" imageClassName="max-h-9" npc={npc} />
    </span>
  );
}
