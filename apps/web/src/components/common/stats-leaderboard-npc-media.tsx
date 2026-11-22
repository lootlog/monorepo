import { NpcTile, type NpcTileNpc } from "@/components/tiles/npc-tile";

type StatsLeaderboardNpcMediaProps = {
  npc: NpcTileNpc;
};

export function StatsLeaderboardNpcMedia({
  npc,
}: StatsLeaderboardNpcMediaProps) {
  return (
    <span className="w-8 shrink-0">
      <NpcTile className="h-9" imageClassName="max-h-9" npc={npc} />
    </span>
  );
}
